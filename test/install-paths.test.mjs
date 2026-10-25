import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { fileKey, releaseFiles, install, installPaths, installationStatus, uninstall } from '../lib/install.mjs';
import { fileHash, readJSON } from '../lib/io.mjs';

const sourceRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-install-paths-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source'), home = path.join(root, 'isolated home');
  const { files } = await releaseFiles(sourceRoot);
  for (const file of Object.keys(files)) {
    const target = path.join(source, file); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.copyFile(path.join(sourceRoot, file), target);
  }
  for (const file of ['docs/nested/deep/example.md', 'skills/aimship/agents/nested/meta.txt']) {
    const target = path.join(source, file); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, 'Synthetic nested fixture.\n');
  }
  const version = async value => { const pkg = await readJSON(path.join(source, 'package.json')); pkg.version = value; await fs.writeFile(path.join(source, 'package.json'), JSON.stringify(pkg)); };
  await version('9.0.0-preview.1');
  return { root, source, home, version, p: installPaths(home) };
}

test('full release index has identical keys and hashes under POSIX and simulated Windows relative paths', async t => {
  const { source } = await fixture(t), { files } = await releaseFiles(source);
  const nativeWindows = Object.fromEntries(Object.entries(files).map(([key, value]) => [path.win32.join(...key.split('/')), value]));
  assert.equal(nativeWindows['bin/aimship.mjs'], undefined, 'Reproduce the original fixed-slash lookup mismatch.');
  const normalized = Object.fromEntries(Object.entries(nativeWindows).map(([key, value]) => [fileKey(key, path.win32), value]));
  assert.deepEqual(normalized, files);
  for (const key of ['bin/aimship.mjs', 'lib/install.mjs', 'skills/aimship/SKILL.md', 'skills/aimship/references/core.md', 'docs/nested/deep/example.md']) {
    assert.match(normalized[key], /^[a-f0-9]{64}$/);
    assert.equal(fileKey(path.win32.relative('C:\\isolated\\release', path.win32.join('C:\\isolated\\release', key)), path.win32), key);
  }
  assert.ok(Object.keys(files).every(key => !key.includes('\\')));
  await fs.rm(path.join(source, 'lib/install.mjs'));
  await assert.rejects(releaseFiles(source), { code: 'INCOMPLETE_RELEASE' });
});

test('file-key conversion rejects traversal, absolute paths and ambiguous POSIX backslash names', () => {
  for (const paths of [path.posix, path.win32]) {
    for (const key of ['../secret', '..\\secret', '/absolute', '\\absolute', 'C:\\absolute', 'C:relative', 'a/../secret', 'a\\..\\secret', '']) assert.throws(() => fileKey(key, paths), { code: 'INVALID_RELEASE' });
  }
  assert.throws(() => fileKey('literal\\name.md', path.posix), { code: 'INVALID_RELEASE' });
  assert.equal(fileKey('docs\\nested\\file.md', path.win32), 'docs/nested/file.md');
  assert.equal(fileKey('docs/nested/file.md', path.posix), 'docs/nested/file.md');
});

test('canonical manifests remain consistent through complete-tree install, repair, upgrades and shared-host uninstall', async t => {
  const c = await fixture(t);
  const assertManifest = async () => {
    const m = await readJSON(c.p.manifest);
    assert.ok(Object.keys(m.managed).every(key => !key.includes('\\')));
    assert.ok(m.managed['.aimship/bin/aimship.mjs']);
    for (const release of Object.values(m.releases)) assert.ok(Object.keys(release.files).every(key => !key.includes('\\')));
    assert.equal((await installationStatus({ home: c.home })).healthy, true);
    return m;
  };
  await install(c.source, { home: c.home, hosts: ['codex', 'cursor', 'claude-code'] });
  let m = await assertManifest();
  assert.ok(m.managed['.agents/skills/aimship/agents/nested/meta.txt']);
  assert.ok(m.managed['.claude/skills/aimship/agents/nested/meta.txt']);
  assert.equal((await install(c.source, { home: c.home })).result, 'unchanged');
  const nested = path.join(c.p.root, 'releases', m.activeVersion, 'docs/nested/deep/example.md');
  await fs.rm(nested);
  assert.equal((await install(c.source, { home: c.home })).result, 'repaired');
  assert.equal(await fileHash(nested), (await releaseFiles(c.source)).files['docs/nested/deep/example.md']);
  await fs.appendFile(nested, 'user edit');
  await assert.rejects(install(c.source, { home: c.home }), error => error.code === 'INSTALL_INCOMPLETE' && error.details.cause.code === 'RELEASE_CONFLICT');
  assert.match(await fs.readFile(nested, 'utf8'), /user edit/);
  await fs.copyFile(path.join(c.source, 'docs/nested/deep/example.md'), nested);
  await install(c.source, { home: c.home });
  for (const version of ['9.0.0-preview.2', '9.0.0-preview.3']) {
    await c.version(version); await fs.appendFile(path.join(c.source, 'docs/nested/deep/example.md'), version + '\n');
    assert.equal((await install(c.source, { home: c.home })).action, 'upgrade');
    m = await assertManifest();
    assert.deepEqual(m.releases[version].files, (await releaseFiles(c.source)).files);
  }
  assert.deepEqual(Object.keys(m.releases).sort(), ['9.0.0-preview.2', '9.0.0-preview.3']);
  assert.equal((await uninstall({ home: c.home, hosts: ['codex'] })).coreRetained, true);
  m = await assertManifest(); assert.ok(m.managed['.agents/skills/aimship/SKILL.md']);
  await uninstall({ home: c.home, hosts: ['cursor'] });
  m = await assertManifest(); assert.equal(m.managed['.agents/skills/aimship/SKILL.md'], undefined); assert.ok(m.managed['.claude/skills/aimship/SKILL.md']);
  assert.equal((await uninstall({ home: c.home })).preserved.length, 0);
  m = await readJSON(c.p.manifest); assert.deepEqual(m.managed, {}); assert.deepEqual(m.releases, {});
  assert.equal((await installationStatus({ home: c.home })).installation, 'uninstalled');
});

test('canonical indexing retains symlink and out-of-root release protection', async t => {
  const c = await fixture(t), outside = path.join(c.root, 'outside.txt');
  await fs.writeFile(outside, 'must remain outside');
  await fs.symlink(outside, path.join(c.source, 'docs/nested/link.md'));
  await assert.rejects(releaseFiles(c.source), { code: 'SYMLINK' });
  await fs.rm(path.join(c.source, 'docs/nested/link.md'));
  const pkg = await readJSON(path.join(c.source, 'package.json')); pkg.files.push('../outside.txt');
  await fs.writeFile(path.join(c.source, 'package.json'), JSON.stringify(pkg));
  await assert.rejects(releaseFiles(c.source), { code: 'INVALID_RELEASE' });
  assert.equal(await fs.readFile(outside, 'utf8'), 'must remain outside');
});
