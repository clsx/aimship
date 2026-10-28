import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateInitLocation } from '../lib/location.mjs';

async function setup(t) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-location-')));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  const dataRoot = path.join(base, 'deliveries'), project = path.join(base, 'project');
  await fs.mkdir(project);
  return { base, dataRoot, project, runtime: { dataRoot } };
}
test('initialization location: configured root wins over an accessible project; validation creates nothing', async t => {
  const c = await setup(t), target = path.join(c.dataRoot, 'account-feature');
  assert.deepEqual(await validateInitLocation(target, {}, c.runtime), { mode: 'configured', dataRoot: c.dataRoot });
  await assert.rejects(fs.access(c.dataRoot), { code: 'ENOENT' });
  await assert.rejects(validateInitLocation(c.project, {}, c.runtime), { code: 'INIT_LOCATION_REQUIRED' });
  assert.deepEqual(await fs.readdir(c.project), []);
});
test('initialization location: root itself and forged dataRoot are rejected', async t => {
  const c = await setup(t);
  await assert.rejects(validateInitLocation(c.dataRoot, {}, c.runtime), { code: 'INIT_LOCATION_ROOT' });
  await assert.rejects(validateInitLocation(c.dataRoot, { storage: { mode: 'explicit', decisionRef: 'source/location.md' } }, c.runtime), { code: 'INIT_LOCATION_ROOT' });
  for (const dataRoot of [null, '', 'relative-root']) await assert.rejects(validateInitLocation(c.project, {}, { dataRoot }), { code: 'INVALID_STORAGE' });
  for (const storage of [true, { mode: 'configured', dataRoot: c.project }, { mode: 'explicit', dataRoot: c.project, decisionRef: 'source/location.md' }]) {
    await assert.rejects(validateInitLocation(c.project, { storage }, c.runtime), { code: 'INVALID_STORAGE' });
  }
});
test('initialization location: explicit override needs a readable nonempty local decision file', async t => {
  const c = await setup(t), storage = { mode: 'explicit', decisionRef: 'source/location.md' };
  await assert.rejects(validateInitLocation(c.project, { storage: { mode: 'explicit' } }, c.runtime), { code: 'INVALID_STORAGE' });
  await assert.rejects(validateInitLocation(c.project, { storage }, c.runtime), { code: 'LOCATION_DECISION' });
  await fs.mkdir(path.join(c.project, 'source'));
  await fs.writeFile(path.join(c.project, storage.decisionRef), ' ');
  await assert.rejects(validateInitLocation(c.project, { storage }, c.runtime), { code: 'INVALID_STORAGE' });
  await fs.writeFile(path.join(c.project, storage.decisionRef), 'Synthetic user decision: save this delivery in the project folder.');
  assert.deepEqual(await validateInitLocation(c.project, { storage }, c.runtime), { ...storage, dataRoot: c.dataRoot });
  for (const decisionRef of ['https://example.test/decision', '../decision.md', '/decision.md', 'repo:code/decision.md', 'source/location.md#approval', 'C:\\decision.md', 'source']) {
    await assert.rejects(validateInitLocation(c.project, { storage: { mode: 'explicit', decisionRef } }, c.runtime), { code: 'INVALID_STORAGE' });
  }
});
test('initialization location: symbolic aliases and source evidence escapes are rejected', async t => {
  const c = await setup(t);
  await fs.mkdir(c.dataRoot);
  await fs.symlink(c.project, path.join(c.dataRoot, 'alias'));
  await assert.rejects(validateInitLocation(path.join(c.dataRoot, 'alias', 'new'), {}, c.runtime), { code: 'SYMLINK' });
  const rootAlias = path.join(c.base, 'root-alias'); await fs.symlink(c.dataRoot, rootAlias);
  await assert.rejects(validateInitLocation(path.join(rootAlias, 'new'), {}, { dataRoot: rootAlias }), { code: 'SYMLINK' });
  const evidence = path.join(c.base, 'decision.md'); await fs.writeFile(evidence, 'Synthetic decision');
  await fs.symlink(evidence, path.join(c.project, 'decision.md'));
  await assert.rejects(validateInitLocation(c.project, { storage: { mode: 'explicit', decisionRef: 'decision.md' } }, c.runtime), { code: 'SYMLINK' });
  await assert.rejects(validateInitLocation(path.join(c.dataRoot, '..', 'project'), {}, c.runtime), { code: 'INIT_LOCATION_REQUIRED' });
});
test('initialization location: inaccessible ancestor fails without fallback (simulated EACCES)', async t => {
  const c = await setup(t), access = fs.access;
  t.mock.method(fs, 'access', async (file, ...args) => {
    if (file === c.base) throw Object.assign(new Error('Synthetic denial'), { code: 'EACCES' });
    return access(file, ...args);
  });
  await assert.rejects(validateInitLocation(path.join(c.dataRoot, 'new'), {}, c.runtime), error => error.code === 'LOCATION_ACCESS' && error.details.cause === 'EACCES');
  assert.deepEqual(await fs.readdir(c.base), ['project']);
});
test('initialization location: default root is the user data root, not the caller workspace', async t => {
  const c = await setup(t);
  // Only inspect the default's existing parent. Never create or change ~/Aimship.
  await assert.rejects(validateInitLocation(c.project, {}), { code: 'INIT_LOCATION_REQUIRED' });
});
