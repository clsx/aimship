import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { exists, json, readJSON } from '../lib/io.mjs';
import { install, installPaths, installationStatus, uninstall } from '../lib/install.mjs';
import { run } from '../lib/cli.mjs';
import { initState, updateState } from '../lib/state.mjs';

const SOURCE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VERSION = (await readJSON(path.join(SOURCE, 'package.json'))).version;
const NEXT = '0.2.0-preview.1';
async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-lifecycle-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'package'); const home = path.join(root, 'isolated home');
  await fs.mkdir(source);
  for (const dir of ['bin', 'lib']) await fs.cp(path.join(SOURCE, dir), path.join(source, dir), { recursive: true });
  const skill = path.join(source, 'skills/aimship'); await fs.mkdir(path.join(skill, 'references'), { recursive: true }); await fs.mkdir(path.join(skill, 'agents'));
  await fs.writeFile(path.join(skill, 'SKILL.md'), '---\nname: aimship\ndisable-model-invocation: true\n---\nRun "{{AIMSHIP_NODE}}" "{{AIMSHIP_LAUNCHER}}" bind.\nRead [core](references/core.md).\n');
  await fs.writeFile(path.join(skill, 'references/core.md'), '# Synthetic lifecycle rules\n');
  await fs.writeFile(path.join(skill, 'agents/openai.yaml'), 'policy:\n  allow_implicit_invocation: false\n');
  await fs.writeFile(path.join(source, 'package.json'), json({ name: 'aimship', version: VERSION, private: true, type: 'module', files: ['bin/', 'lib/', 'skills/'] }));
  return { root, source, home, p: installPaths(home) };
}
function cli(file, args) {
  const result = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', timeout: 60_000 });
  assert.equal(result.error, undefined, result.error?.message);
  const output = result.status === 0 ? result.stdout : result.stderr;
  assert.ok(output.trim(), 'CLI must report its result as JSON');
  return { ...result, data: JSON.parse(output) };
}
async function setVersion(source, version) {
  const file = path.join(source, 'package.json'); const pkg = await readJSON(file); pkg.version = version; await fs.writeFile(file, json(pkg));
}
async function completedDelivery(home) {
  const directory = path.join(home, 'Aimship/completed-design'); await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'requirements.md'), '# Synthetic original goal\nDesign handoff only.\n');
  await fs.writeFile(path.join(directory, 'results.md'), '# Synthetic recorded facts\n## Handoff\n## Acceptance\n');
  const runtime = { version: VERSION, activeVersion: VERSION };
  const run = { id: 'handoff-1', stage: 'handoff', scope: 'Confirmed design-only endpoint', progress: 'planned', inputRefs: ['requirements.md'], outputRefs: ['results.md'] };
  await fs.mkdir(path.join(directory,'source')); await fs.writeFile(path.join(directory,'source/request.md'),'Synthetic design request');
  await initState(directory, { deliveryPolicy:{version:1,partialRef:'requirements.md'}, documentPolicy:{authority:'editable',interaction:false,prototypeCovered:false,interface:'none',databases:[]}, documents:[{kind:'prd',path:'requirements.md',mode:'reused',version:'1',basisRef:'requirements.md'},{kind:'handoff',path:'results.md',mode:'reused',version:'1',basisRef:'results.md'}], goal: { summary: 'Synthetic design delivery', endpoint: 'Design handoff only' }, goalRef: 'requirements.md', stageRuns: [run], currentRun: 'handoff-1' }, VERSION, runtime);
  await updateState(directory, { stageRuns: [{ ...run, progress: 'done', resultRef: 'results.md#handoff' }], outcome: { goal: 'met', goalConclusionRef: 'results.md#handoff', acceptance: 'accepted', acceptanceRef: 'results.md#acceptance' } }, 0, VERSION, runtime);
  return { directory, stateBytes: await fs.readFile(path.join(directory, '.aimship/state.json'), 'utf8'), resultBytes: await fs.readFile(path.join(directory, 'results.md'), 'utf8') };
}

test('lifecycle status and version do not create an uninstalled home', { timeout: 60_000 }, async t => {
  const { source, home } = await fixture(t);
  const status = await run(['status', '--home', home], { sourceRoot: source });
  assert.equal(status.data.installation, 'not-installed'); assert.equal(status.data.installedActiveVersion, null); assert.equal(status.data.registeredHosts, null);
  assert.ok(status.data.hosts.every(host => host.registered === null && host.entryPresent === false && host.hostLoaded === 'not-verified'));
  const version = await run(['--version', '--home', home], { sourceRoot: source });
  assert.equal(version.data.toolVersion, VERSION); assert.equal(version.data.installedActiveVersion, null);
  assert.equal(await exists(home), false);
});

test('lifecycle status separates shared entry presence from host registration and actual loading', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t);
  const installed = await install(source, { home, hosts: ['codex'] });
  assert.equal(installed.fromVersion, null); assert.equal(installed.toVersion, VERSION); assert.equal(installed.action, 'install'); assert.equal(installed.result, 'success'); assert.deepEqual(installed.addedHosts, ['codex']);
  const before = await fs.readFile(p.manifest, 'utf8'); const status = cli(p.launcher, ['status']); assert.equal(status.status, 0, status.stderr);
  assert.equal(status.data.data.healthy, true); assert.deepEqual(status.data.data.registeredHosts, ['codex']);
  const codex = status.data.data.hosts.find(host => host.host === 'codex'); const cursor = status.data.data.hosts.find(host => host.host === 'cursor'); const claude = status.data.data.hosts.find(host => host.host === 'claude-code');
  assert.equal(codex.registered, true); assert.equal(codex.entryIntegrity, 'intact'); assert.deepEqual(codex.sharedWith, ['cursor']);
  assert.equal(cursor.registered, false); assert.equal(cursor.entryPresent, true); assert.equal(cursor.hostLoaded, 'not-verified'); assert.equal(cursor.login, 'not-verified'); assert.equal(cursor.permissions, 'not-verified');
  assert.equal(claude.registered, false); assert.equal(claude.entryPresent, false); assert.equal(status.data.data.unselectedHostDiscoveryPossible, true);
  assert.equal(await fs.readFile(p.manifest, 'utf8'), before); assert.equal(await exists(path.join(home, 'Aimship')), false);
});

test('lifecycle status reports modified, missing and damaged managed files without repairing them', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t); await install(source, { home, hosts: ['codex'] });
  const entry = path.join(home, '.agents/skills/aimship/SKILL.md'); const originalEntry = await fs.readFile(entry, 'utf8');
  await fs.appendFile(entry, '\nUser instruction: keep this.\n');
  let status = await installationStatus({ home }); assert.equal(status.installation, 'damaged'); assert.equal(status.hosts[0].entryIntegrity, 'modified');
  await assert.rejects(install(source, { home }), error => error.code === 'USER_MODIFIED' && error.details.toVersion === VERSION && error.details.activeVersion === VERSION && error.details.result === 'failed');
  assert.ok((await fs.readFile(entry, 'utf8')).includes('keep this'));
  await fs.writeFile(entry, originalEntry); const metadata = path.join(home, '.agents/skills/aimship/agents/openai.yaml'); await fs.rm(metadata);
  status = await installationStatus({ home }); assert.equal(status.hosts[0].entryIntegrity, 'damaged'); assert.equal(await exists(metadata), false);
  const stateTool = path.join(p.root, 'releases', VERSION, 'lib/state.mjs'); await fs.rm(stateTool);
  status = await installationStatus({ home }); assert.equal(status.release.integrity, 'damaged'); assert.ok(status.release.files.some(file => file.path === stateTool && file.integrity === 'missing'));
  await fs.rm(p.launcher); status = await installationStatus({ home }); assert.ok(status.issues.some(issue => issue.code === 'LAUNCHER_INTEGRITY'));
  const config = await fs.readFile(p.config, 'utf8'); await fs.writeFile(p.config, '{damaged config');
  status = await installationStatus({ home }); assert.equal(status.config.status, 'invalid'); assert.equal(await fs.readFile(p.config, 'utf8'), '{damaged config'); await fs.writeFile(p.config, config);
  const manifest = await fs.readFile(p.manifest, 'utf8'); await fs.writeFile(p.manifest, '{damaged manifest');
  status = await installationStatus({ home }); assert.equal(status.manifest.status, 'invalid'); assert.equal(status.registeredHosts, null); assert.ok(status.hosts.every(host => host.registered === null)); assert.equal(await fs.readFile(p.manifest, 'utf8'), '{damaged manifest');
  const incompleteList = JSON.parse(manifest); incompleteList.releases[VERSION].files = {}; await fs.writeFile(p.manifest, json(incompleteList));
  status = await installationStatus({ home }); assert.equal(status.manifest.status, 'invalid'); assert.ok(status.issues.some(issue => issue.code === 'INSTALL_FORMAT')); assert.equal(status.healthy, false);
  await fs.writeFile(p.manifest, manifest); await fs.rm(p.manifest);
  status = await installationStatus({ home }); assert.equal(status.installation, 'unmanaged'); assert.equal(status.registeredHosts, null); assert.equal(await exists(p.manifest), false);
});

test('lifecycle upgrade distinguishes versions, preserves completed delivery/custom, and recovers pending install', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t); await install(source, { home, hosts: ['codex'] });
  const repeated = await install(source, { home }); assert.equal(repeated.action, 'reinstall'); assert.equal(repeated.result, 'unchanged'); assert.deepEqual(repeated.addedHosts, []);
  const added = await install(source, { home, hosts: ['cursor'] }); assert.equal(added.action, 'add-hosts'); assert.deepEqual(added.addedHosts, ['cursor']);
  const completed = await completedDelivery(home); const custom = path.join(p.root, 'custom/template.md'); await fs.writeFile(custom, 'User-owned custom instructions\n');
  const config = await fs.readFile(p.config, 'utf8'); await fs.writeFile(p.config, json({ schemaVersion: 99 })); await setVersion(source, NEXT);
  await assert.rejects(install(source, { home }), error => error.code === 'INSTALL_INCOMPLETE' && error.details.fromVersion === VERSION && error.details.toVersion === NEXT && error.details.activeVersion === VERSION && error.details.action === 'upgrade' && error.details.result === 'incomplete');
  const pending = cli(p.launcher, ['status']); assert.equal(pending.status, 0, pending.stderr); assert.equal(pending.data.data.installation, 'incomplete'); assert.equal(pending.data.data.installedActiveVersion, VERSION); assert.equal(pending.data.data.pending.version, NEXT); assert.equal(pending.data.data.config.status, 'invalid');
  await fs.writeFile(p.config, config); const recovered = await install(source, { home }); assert.equal(recovered.action, 'upgrade'); assert.equal(recovered.result, 'recovered'); assert.equal(recovered.fromVersion, VERSION); assert.equal(recovered.toVersion, NEXT);
  const oldTool = path.join(p.root, 'releases', VERSION, 'bin/aimship.mjs'); const version = cli(oldTool, ['--version']); assert.equal(version.status, 0, version.stderr); assert.equal(version.data.data.toolVersion, VERSION); assert.equal(version.data.data.installedActiveVersion, NEXT);
  assert.equal(await fs.readFile(path.join(completed.directory, '.aimship/state.json'), 'utf8'), completed.stateBytes); assert.equal(await fs.readFile(path.join(completed.directory, 'results.md'), 'utf8'), completed.resultBytes); assert.equal(await fs.readFile(custom, 'utf8'), 'User-owned custom instructions\n');
  await fs.writeFile(p.active, '{damaged active pointer'); const diagnostic = cli(p.launcher, ['status']); assert.equal(diagnostic.status, 0, diagnostic.stderr); assert.equal(diagnostic.data.data.installation, 'damaged'); assert.equal(diagnostic.data.data.active.status, 'invalid'); assert.equal(await fs.readFile(p.active, 'utf8'), '{damaged active pointer');
});

test('lifecycle initial pending install is visible without inventing a registered host or active version', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t); await fs.mkdir(p.root, { recursive: true }); await fs.writeFile(p.config, json({ schemaVersion: 99 }));
  await assert.rejects(install(source, { home, hosts: ['codex'] }), { code: 'INSTALL_INCOMPLETE' });
  const status = cli(p.launcher, ['status']); assert.equal(status.status, 0, status.stderr); assert.equal(status.data.data.installation, 'incomplete'); assert.equal(status.data.data.installedActiveVersion, null); assert.equal(status.data.data.pending.version, VERSION); assert.deepEqual(status.data.data.registeredHosts, []); assert.equal(status.data.data.hosts.find(host => host.host === 'codex').entryPresent, true);
  const version = cli(p.launcher, ['--version']); assert.equal(version.status, 0, version.stderr); assert.equal(version.data.data.toolVersion, VERSION); assert.equal(version.data.data.installedActiveVersion, null); assert.equal(version.data.data.pendingVersion, VERSION);
  assert.equal(await exists(p.active), false);
});

test('lifecycle same-version reinstall repairs only missing managed release and entry files', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t); await install(source, { home, hosts: ['codex'] });
  const missing = [p.launcher, path.join(p.root, 'releases', VERSION, 'lib/state.mjs'), path.join(home, '.agents/skills/aimship/agents/openai.yaml')];
  for (const file of missing) await fs.rm(file);
  assert.equal((await installationStatus({ home })).healthy, false);
  const repaired = await install(source, { home }); assert.equal(repaired.action, 'reinstall'); assert.equal(repaired.result, 'repaired');
  for (const file of missing) assert.equal(await exists(file), true);
  const status = cli(p.launcher, ['status']); assert.equal(status.status, 0, status.stderr); assert.equal(status.data.data.healthy, true);
});

test('lifecycle reinstall reports repaired when only one internal release file was missing', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t); await install(source, { home, hosts: ['codex'] });
  const internal = path.join(p.root, 'releases', VERSION, 'lib/state.mjs');
  const entry = path.join(home, '.agents/skills/aimship/SKILL.md');
  const launcherBytes = await fs.readFile(p.launcher, 'utf8'); const entryBytes = await fs.readFile(entry, 'utf8');
  await fs.rm(internal);
  assert.equal(await exists(path.dirname(internal)), true); assert.equal(await exists(p.launcher), true); assert.equal(await exists(entry), true);
  const repaired = await install(source, { home });
  assert.equal(repaired.action, 'reinstall'); assert.equal(repaired.result, 'repaired'); assert.equal(repaired.fromVersion, VERSION); assert.equal(repaired.toVersion, VERSION);
  assert.equal(await fs.readFile(internal, 'utf8'), await fs.readFile(path.join(source, 'lib/state.mjs'), 'utf8'));
  assert.equal(await fs.readFile(p.launcher, 'utf8'), launcherBytes); assert.equal(await fs.readFile(entry, 'utf8'), entryBytes);
});

test('lifecycle reinstall reports repaired when only the active pointer was missing', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t); await install(source, { home, hosts: ['codex'] });
  const entry = path.join(home, '.agents/skills/aimship/SKILL.md');
  const launcherBytes = await fs.readFile(p.launcher, 'utf8'); const entryBytes = await fs.readFile(entry, 'utf8');
  await fs.rm(p.active);
  const repaired = await install(source, { home });
  assert.equal(repaired.action, 'reinstall'); assert.equal(repaired.result, 'repaired'); assert.equal(repaired.fromVersion, VERSION); assert.equal(repaired.toVersion, VERSION);
  assert.equal((await readJSON(p.active)).version, VERSION);
  const version = cli(p.launcher, ['--version']); assert.equal(version.status, 0, version.stderr); assert.equal(version.data.data.installedActiveVersion, VERSION); assert.equal(version.data.data.installation, 'installed');
  const status = cli(p.launcher, ['status']); assert.equal(status.status, 0, status.stderr); assert.equal(status.data.data.healthy, true); assert.equal(status.data.data.installedActiveVersion, VERSION);
  assert.equal(await fs.readFile(p.launcher, 'utf8'), launcherBytes); assert.equal(await fs.readFile(entry, 'utf8'), entryBytes);
});

test('lifecycle last-host disconnect retains shared core for status, version, update and later reconnection', { timeout: 60_000 }, async t => {
  const { source, home, p } = await fixture(t); await install(source, { home, hosts: ['codex', 'cursor'] });
  const completed = await completedDelivery(home);
  const partial = await uninstall({ home, hosts: ['codex'] }); assert.equal(partial.coreRetained, true); assert.deepEqual(partial.remainingHosts, ['cursor']); assert.ok(partial.sharedEntriesRetained.some(entry => entry.registeredHosts.includes('cursor'))); assert.equal(await exists(path.join(home, '.agents/skills/aimship/SKILL.md')), true);
  const last = cli(p.launcher, ['uninstall', '--host', 'cursor']); assert.equal(last.status, 0, last.stderr); assert.equal(last.data.data.coreRetained, true); assert.deepEqual(last.data.data.remainingHosts, []); assert.equal(await exists(p.launcher), true); assert.equal(await exists(p.active), true); assert.equal(await exists(path.join(home, '.agents/skills/aimship/SKILL.md')), false);
  const status = cli(p.launcher, ['status']); assert.equal(status.status, 0, status.stderr); assert.equal(status.data.data.healthy, true); assert.deepEqual(status.data.data.registeredHosts, []);
  const version = cli(p.launcher, ['--version']); assert.equal(version.status, 0, version.stderr); assert.equal(version.data.data.installedActiveVersion, VERSION);
  const repeated = cli(p.launcher, ['install']); assert.equal(repeated.status, 0, repeated.stderr); assert.equal(repeated.data.data.action, 'reinstall'); assert.deepEqual(repeated.data.data.hosts, []);
  await setVersion(source, NEXT); const upgraded = await install(source, { home }); assert.equal(upgraded.action, 'upgrade'); assert.deepEqual(upgraded.hosts, []);
  const reconnected = cli(p.launcher, ['install', '--host', 'claude-code']); assert.equal(reconnected.status, 0, reconnected.stderr); assert.equal(reconnected.data.data.action, 'add-hosts'); assert.deepEqual(reconnected.data.data.addedHosts, ['claude-code']); assert.equal(await exists(path.join(home, '.claude/skills/aimship/SKILL.md')), true);
  const full = cli(p.launcher, ['uninstall']); assert.equal(full.status, 0, full.stderr); assert.equal(full.data.data.coreRetained, false); assert.equal(await exists(p.launcher), false); assert.equal(await exists(p.active), false); assert.equal(await exists(p.config), true); assert.equal(await fs.readFile(path.join(completed.directory, '.aimship/state.json'), 'utf8'), completed.stateBytes);
  assert.equal((await installationStatus({ home })).installation, 'uninstalled');
});
