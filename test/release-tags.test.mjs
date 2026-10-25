import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { assertForwardTags, syncTags } from '../scripts/release-tags.mjs';
import { validateSyncContext, registry } from '../scripts/release-preview.mjs';

const version = '0.1.0-preview.9', integrity = 'sha512-example';
const metadata = () => ({ name: 'aimship', versions: { [version]: { dist: { integrity } } }, 'dist-tags': { latest: '0.1.0-preview.4', preview: version } });

test('release ordering prevents either tag rollback including stable and numeric preview ordering', () => {
  assert.doesNotThrow(() => assertForwardTags(metadata(), version));
  assert.doesNotThrow(() => assertForwardTags(metadata(), '0.1.0-preview.10'));
  for (const tag of ['latest', 'preview']) {
    for (const newer of ['0.1.0-preview.10', '0.1.0', '0.2.0-preview.1', '1.0.0']) {
      const current = metadata(); current['dist-tags'][tag] = newer;
      assert.throws(() => assertForwardTags(current, version), /roll back/);
    }
  }
  for (const value of ['0.1.0-beta.1', 'garbage', '0.1.0-preview.09']) {
    const current = metadata(); current['dist-tags'].latest = value;
    assert.throws(() => assertForwardTags(current, version), /Unsupported/);
  }
  assert.throws(() => assertForwardTags({}, version), /Incomplete/);
  assert.throws(() => assertForwardTags(metadata(), '0.1.0'), /Only preview/);
});

test('tag synchronization writes only missing tags and repeat runs perform no writes', async () => {
  const current = metadata(), writes = [];
  const options = { read: async () => structuredClone(current), add: async (target, tag) => { writes.push(tag); current['dist-tags'][tag] = target; } };
  assert.equal((await syncTags(version, integrity, options))['dist-tags'].latest, version);
  await syncTags(version, integrity, options);
  assert.deepEqual(writes, ['latest']);
});

test('uncertain or denied tag writes are not retried; next run reads actual state', async () => {
  const current = metadata(); let writes = 0;
  const read = async () => structuredClone(current);
  await assert.rejects(syncTags(version, integrity, { read, add: async (_, tag) => { writes++; current['dist-tags'][tag] = version; throw new Error('lost response'); } }), /lost response/);
  await syncTags(version, integrity, { read, add: async () => assert.fail('already applied') });
  assert.equal(writes, 1);
  current['dist-tags'].latest = '0.1.0-preview.4';
  await assert.rejects(syncTags(version, integrity, { read, add: async () => { writes++; throw new Error('permission denied'); } }), /permission denied/);
  assert.equal(writes, 2);
  assert.equal(current['dist-tags'].latest, '0.1.0-preview.4');
});

test('partial tag completion recovers while concurrent newer tags or changed bytes stop writes', async () => {
  const current = metadata(); current['dist-tags'].preview = '0.1.0-preview.8';
  const read = async () => structuredClone(current), writes = [];
  await assert.rejects(syncTags(version, integrity, { read, add: async (target, tag) => { writes.push(tag); if (tag === 'latest') throw new Error('denied'); current['dist-tags'][tag] = target; } }), /denied/);
  await syncTags(version, integrity, { read, add: async (target, tag) => { writes.push(tag); current['dist-tags'][tag] = target; } });
  assert.deepEqual(writes, ['preview', 'latest', 'latest']);
  current['dist-tags'].latest = '0.1.0-preview.10';
  await assert.rejects(syncTags(version, integrity, { read, add: async () => assert.fail('rollback') }), /roll back/);
  current['dist-tags'].latest = version;
  current.versions[version].dist.integrity = 'different';
  await assert.rejects(syncTags(version, integrity, { read, add: async () => assert.fail('bytes') }), /integrity/);
});

test('tag visibility polling is bounded and never repeats the write', async () => {
  let writes = 0, pauses = 0;
  await assert.rejects(syncTags(version, integrity, { read: async () => metadata(), add: async () => writes++, pause: async () => pauses++, attempts: 3 }), /verification pending/);
  assert.equal(writes, 1); assert.equal(pauses, 2);
});

test('existing-release context requires current main workflow and exact target tag package', () => {
  const head = 'a'.repeat(40), commit = 'b'.repeat(40);
  const env = { RELEASE_TAG: `v${version}`, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: head, GITHUB_REPOSITORY: 'clsx/aimship', GITHUB_EVENT_NAME: 'workflow_dispatch' };
  const pkg = { name: 'aimship', version, publishConfig: { registry, tag: 'preview', access: 'public' } };
  assert.equal(validateSyncContext(env, pkg, head, commit).commit, commit);
  for (const patch of [{ GITHUB_REF: `refs/tags/v${version}` }, { GITHUB_SHA: commit }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_REPOSITORY: 'other/aimship' }, { RELEASE_TAG: 'v0.1.0-preview.8' }]) assert.throws(() => validateSyncContext({ ...env, ...patch }, pkg, head, commit));
  assert.throws(() => validateSyncContext(env, pkg, head, 'bad'));
});

test('sync workflow separates read-only validation from OIDC and never invokes package publication', async () => {
  const workflow = (await fs.readFile(new URL('../.github/workflows/publish-preview.yml', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const validation = workflow.split('\n  publish:\n')[0], sync = workflow.split('\n  sync-tags:\n')[1];
  assert.match(validation, /check-tags/); assert.doesNotMatch(validation, /id-token:/);
  assert.match(sync, /needs: validate/); assert.match(sync, /id-token: write/);
  assert.match(sync, /npm@11\.21\.0/); assert.match(sync, /fetch-depth: 0/);
  assert.match(sync, /release-preview\.mjs sync-tags/);
  assert.doesNotMatch(sync, /npm publish|release-preview\.mjs publish|contents: write|secrets\./);
});
