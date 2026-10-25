import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registry, validateContext, publicationDecision, verifyPackage, waitForRegistry } from '../scripts/release-preview.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const head = 'a'.repeat(40);
const env = { RELEASE_TAG: 'v0.1.0-preview.9', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REPOSITORY: 'clsx/aimship', GITHUB_REF: 'refs/tags/v0.1.0-preview.9', GITHUB_SHA: head };
const pkg = { name: 'aimship', version: '0.1.0-preview.9', publishConfig: { registry, tag: 'preview', access: 'public' } };

test('release context requires manual exact preview tag, repository, commit and package configuration', () => {
  assert.equal(validateContext(env, pkg, head).version, pkg.version);
  for (const tag of ['v0.1.0', 'v0.1.0-beta.1', 'v0.1.0-preview.01', 'v0.1.0-preview.9;echo bad', '', undefined]) assert.throws(() => validateContext({ ...env, RELEASE_TAG: tag }, pkg, head));
  for (const patch of [{ GITHUB_REF: 'refs/heads/main' }, { GITHUB_REF: 'refs/tags/v0.1.0-preview.8' }, { GITHUB_REPOSITORY: 'other/aimship' }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_SHA: 'b'.repeat(40) }]) assert.throws(() => validateContext({ ...env, ...patch }, pkg, head));
  for (const patch of [{ name: 'other' }, { version: '0.1.0-preview.8' }, { publishConfig: { ...pkg.publishConfig, tag: 'latest' } }, { publishConfig: { ...pkg.publishConfig, registry: 'https://example.com' } }, { publishConfig: { ...pkg.publishConfig, access: 'restricted' } }]) assert.throws(() => validateContext(env, { ...pkg, ...patch }, head));
});

test('registry release decision fails closed and only skips an identical already-published package', () => {
  const manifest = { version: pkg.version, integrity: 'sha512-example' };
  const metadata = { name: 'aimship', versions: {}, 'dist-tags': { latest: '0.1.0-preview.4' } };
  assert.equal(publicationDecision(metadata, manifest), 'publish');
  for (const invalid of [null, {}, { error: 'network' }, { ...metadata, versions: undefined }, { ...metadata, 'dist-tags': {} }]) assert.throws(() => publicationDecision(invalid, manifest));
  metadata.versions[pkg.version] = { dist: { integrity: manifest.integrity } };
  assert.equal(publicationDecision(metadata, manifest), 'already-published');
  metadata.versions[pkg.version].dist.integrity = 'sha512-other';
  assert.throws(() => publicationDecision(metadata, manifest), /different package bytes/);
});

test('post-publication verification tolerates asynchronous registry visibility without republishing', async () => {
  const manifest = { version: pkg.version, integrity: 'sha512-example', latestBefore: '0.1.0-preview.4' };
  const pending = { name: 'aimship', versions: {}, 'dist-tags': { latest: manifest.latestBefore, preview: '0.1.0-preview.8' } };
  const visible = { ...pending, versions: { [manifest.version]: { dist: { integrity: manifest.integrity } } } };
  const complete = structuredClone(visible);
  complete['dist-tags'] = { ...pending['dist-tags'], preview: manifest.version };
  complete.versions[manifest.version].dist.attestations = { url: `${registry}/attestations` };
  const responses = [pending, visible, complete], delays = [];
  assert.equal(await waitForRegistry(manifest, { read: async () => responses.shift(), pause: async ms => delays.push(ms), attempts: 3 }), complete);
  assert.deepEqual(delays, [10000, 10000]);
  let reads = 0;
  await assert.rejects(waitForRegistry(manifest, { read: async () => { reads++; return pending; }, pause: async () => {}, attempts: 3 }), /Publication may already have succeeded/);
  assert.equal(reads, 3);
  const conflicting = structuredClone(complete); conflicting.versions[manifest.version].dist.integrity = 'sha512-other';
  await assert.rejects(waitForRegistry(manifest, { read: async () => conflicting, pause: async () => assert.fail('must not retry conflicting bytes') }), /different package bytes/);
  const changedLatest = structuredClone(complete); changedLatest['dist-tags'].latest = '0.1.0';
  await assert.rejects(waitForRegistry(manifest, { read: async () => changedLatest }), /latest changed/);
});

test('release package compares actual tar members and bytes with source and rejects tampering', async t => {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-release-')));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--cache', path.join(dir, 'npm-cache'), '--pack-destination', dir], { cwd: root, encoding: 'utf8', timeout: 30000 }));
  const file = path.join(dir, packed[0].filename);
  const good = await verifyPackage(file);
  assert.equal(good.integrity, packed[0].integrity);
  assert.equal(good.files, packed[0].files.length);
  execFileSync('tar', ['-xzf', file, '-C', dir]);
  await fs.appendFile(path.join(dir, 'package', 'README.md'), '\nTampered test fixture.\n');
  // Preserve the npm member list, avoiding platform-dependent directory entries.
  const members = execFileSync('tar', ['-tzf', file], { encoding: 'utf8' }).trim().split('\n');
  const bad = path.join(dir, 'tampered.tgz');
  execFileSync('tar', ['-czf', bad, '-C', dir, ...members]);
  await assert.rejects(verifyPackage(bad), /differs from source/);
  const extra = path.join(dir, 'extra.tgz');
  await fs.writeFile(path.join(dir, 'unexpected.txt'), 'not distributable');
  execFileSync('tar', ['-czf', extra, '-C', dir, ...members, 'unexpected.txt']);
  await assert.rejects(verifyPackage(extra), /members differ/);
});

test('preview workflow keeps publication manual, separately permissioned, and uses the validated artifact', async () => {
  const workflow = await fs.readFile(path.join(root, '.github/workflows/publish-preview.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  (push|pull_request|schedule|workflow_run):/m);
  const [validation, publication] = workflow.split('\n  publish:\n');
  assert.doesNotMatch(validation, /id-token:/);
  assert.match(publication, /id-token: write/);
  assert.match(publication, /needs: validate/);
  assert.match(publication, /artifact-ids: \$\{\{ needs.validate.outputs.artifact-id \}\}/);
  assert.doesNotMatch(workflow, /contents: write|NODE_AUTH_TOKEN|NPM_TOKEN|secrets\./);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 2);
  for (const line of workflow.split('\n').filter(line => line.includes('uses:'))) assert.match(line, /@[a-f0-9]{40} # v\d/);
});
