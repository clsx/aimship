// Real published-package checks. Run only on a disposable Windows runner.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const [outputArg, npmCli] = process.argv.slice(2);
assert.equal(process.platform, 'win32', 'This evidence must come from native Windows.');
assert.ok(outputArg && npmCli, 'Provide a new evidence directory and npm-cli.js path.');
const output = path.resolve(outputArg);
await fs.mkdir(output); // Refuse to mix evidence with an earlier run.
const sandbox = path.join(output, 'isolated user space');
const consumer = path.join(sandbox, 'consumer');
await fs.mkdir(consumer, { recursive: true });
const report = {
  environment: { platform: process.platform, release: os.release(), arch: process.arch, node: process.version, shell: 'PowerShell workflow; Node child processes', commit: process.env.GITHUB_SHA, run: process.env.GITHUB_RUN_ID },
  versions: ['0.1.0-preview.16', '0.1.0-preview.17'], checks: [], commands: [],
  limits: 'Synthetic CLI and installation evidence only. No real AI host discovery, login, model generation, UI, or cross-host continuation was tested.'
};
const env = { ...process.env, NPM_CONFIG_CACHE: path.join(sandbox, 'npm cache'), NPM_CONFIG_USERCONFIG: path.join(sandbox, 'empty.npmrc'), NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org', NPM_CONFIG_UPDATE_NOTIFIER: 'false', NPM_CONFIG_FETCH_RETRIES: '1', NPM_CONFIG_FETCH_TIMEOUT: '60000' };
await fs.writeFile(env.NPM_CONFIG_USERCONFIG, '');
function command(label, executable, args, input) {
  const result = spawnSync(executable, args, { cwd: consumer, env, encoding: 'utf8', input, timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  const record = { label, executable, args, exitCode: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.message };
  report.commands.push(record);
  assert.equal(result.error, undefined, `${label}: ${result.error?.message}`);
  assert.equal(result.status, 0, `${label}: ${result.stderr || result.stdout}`);
  return result.stdout;
}
const npm = (label, args) => command(label, process.execPath, [npmCli, ...args]);
const published = (label, version, home, args, offline = false) => {
  const raw = npm(label, ['exec', '--yes', '--ignore-scripts', ...(offline ? ['--offline'] : []), `--package=${version}`, '--', 'aimship', ...args, '--home', home]);
  const parsed = JSON.parse(raw); assert.equal(parsed.ok, true, raw); return parsed.data;
};
const launcher = (label, home, args, input) => {
  const raw = command(label, process.execPath, [path.join(home, '.aimship/bin/aimship.mjs'), ...args], input === undefined ? undefined : JSON.stringify(input));
  const parsed = JSON.parse(raw); assert.equal(parsed.ok, true, raw); return parsed.data;
};
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = async file => fs.access(file).then(() => true, () => false);
const digest = async (file, algorithm = 'sha256', format = 'hex') => createHash(algorithm).update(await fs.readFile(file)).digest(format);
async function check(name, fn) {
  try { const details = await fn(); report.checks.push({ name, result: 'passed', details }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, result: 'failed', error: error.stack }); throw error; }
}
const packages = new Map();
const hosts = ['claude-code', 'codex', 'cursor'];
async function healthy(home, version) {
  const status = launcher(`status ${version}`, home, ['status']);
  assert.equal(status.healthy, true); assert.equal(status.installedActiveVersion, version);
  assert.deepEqual([...status.registeredHosts].sort(), hosts);
  assert.ok(status.hosts.every(h => h.entryPresent && h.entryIntegrity === 'intact' && h.hostLoaded === 'not-verified'));
  assert.equal(launcher(`version ${version}`, home, ['--version']).installedActiveVersion, version);
  const manifest = await readJSON(path.join(home, '.aimship/install-manifest.json'));
  const files = manifest.releases[version].files;
  assert.equal(Object.keys(files).length, 51);
  for (const [file, hash] of Object.entries(files)) {
    assert.equal(await digest(path.join(home, '.aimship/releases', version, file)), hash, file);
    assert.equal(await digest(path.join(packages.get(version).root, file)), hash, `Published bytes: ${file}`);
  }
  const bind = launcher(`bind ${version}`, home, ['bind']);
  assert.equal(bind.version, version);
  assert.equal(bind.releaseRoot, path.join(home, '.aimship/releases', version));
  for (const dir of ['.agents', '.claude']) {
    const entry = await fs.readFile(path.join(home, dir, 'skills/aimship/SKILL.md'), 'utf8');
    assert.ok(entry.includes(path.join(home, '.aimship/bin/aimship.mjs')));
    assert.ok(!entry.includes('{{AIMSHIP_'));
  }
  return { activeVersion: version, releaseFilesCompared: Object.keys(files).length, registeredHosts: status.registeredHosts };
}
async function retainedFiles(home, dataRoot) {
  const files = new Map([
    [path.join(home, '.aimship/config.json'), await fs.readFile(path.join(home, '.aimship/config.json'))],
    [path.join(home, '.aimship/custom/my-rules.md'), Buffer.from('Synthetic personal rules.\n')],
    [path.join(home, '.agents/skills/unrelated/SKILL.md'), Buffer.from('Synthetic unrelated skill.\n')],
    [path.join(dataRoot, 'user notes.txt'), Buffer.from('Synthetic user materials, retained exactly.\n')]
  ]);
  for (const [file, bytes] of files) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes); }
  return files;
}
async function assertRetained(files) { for (const [file, bytes] of files) assert.deepEqual(await fs.readFile(file), bytes, file); }
async function removeAll(home, files) {
  const manifest = await readJSON(path.join(home, '.aimship/install-manifest.json'));
  const result = published('full uninstall', 'aimship@0.1.0-preview.17', home, ['uninstall']);
  assert.equal(result.result, 'success'); assert.equal(result.activeVersion, null); assert.equal(result.coreRetained, false);
  assert.deepEqual(result.preserved, []);
  for (const file of Object.keys(manifest.managed)) assert.equal(await exists(path.join(home, file)), false, file);
  for (const version of Object.keys(manifest.releases)) assert.equal(await exists(path.join(home, '.aimship/releases', version)), false);
  assert.equal(await exists(path.join(home, '.aimship/active.json')), false);
  await assertRetained(files);
  const status = published('status after uninstall', 'aimship@0.1.0-preview.17', home, ['status']);
  assert.equal(status.installation, 'uninstalled'); assert.equal(status.installedActiveVersion, null); assert.deepEqual(status.registeredHosts, []);
  return { result: result.result, retainedFiles: files.size, activeVersion: status.installedActiveVersion };
}
try {
  report.environment.npm = npm('npm version', ['--version']).trim();
  await check('Official npm downloads and registry integrity (.16 and .17)', async () => {
    for (const version of report.versions) {
      const target = path.join(sandbox, version); await fs.mkdir(target);
      const metadata = JSON.parse(npm(`registry metadata ${version}`, ['view', `aimship@${version}`, 'dist', '--json']));
      assert.ok(metadata.tarball.startsWith('https://registry.npmjs.org/aimship/'));
      const [packed] = JSON.parse(npm(`download ${version}`, ['pack', `aimship@${version}`, '--ignore-scripts', '--json', '--pack-destination', target]));
      const archive = path.join(target, packed.filename);
      assert.equal(`sha512-${await digest(archive, 'sha512', 'base64')}`, metadata.integrity);
      assert.equal(await digest(archive, 'sha1'), metadata.shasum);
      command(`extract ${version}`, 'tar', ['-xzf', archive, '-C', target]);
      assert.equal((await readJSON(path.join(target, 'package/package.json'))).version, version);
      packages.set(version, { root: path.join(target, 'package'), archive, integrity: metadata.integrity });
    }
    return Object.fromEntries([...packages].map(([version, p]) => [version, { integrity: p.integrity }]));
  });
  const fresh = path.join(sandbox, 'fresh home');
  let freshRetained;
  await check('Clean registry install .17, all three host entries, fixed launcher and package bytes', async () => {
    const result = published('fresh install .17', 'aimship@0.1.0-preview.17', fresh, ['install', '--host', 'codex', '--host', 'cursor', '--host', 'claude-code']);
    assert.equal(result.action, 'install'); assert.equal(result.result, 'success');
    assert.equal(await exists(path.join(fresh, 'Aimship')), false);
    freshRetained = await retainedFiles(fresh, path.join(fresh, 'Aimship'));
    return healthy(fresh, '0.1.0-preview.17');
  });
  await check('Same-version .17 reinstall preserves configuration, custom files and user materials', async () => {
    const result = published('same-version reinstall', 'aimship@0.1.0-preview.17', fresh, ['install']);
    assert.equal(result.action, 'reinstall'); assert.equal(result.result, 'unchanged');
    await assertRetained(freshRetained); return healthy(fresh, '0.1.0-preview.17');
  });
  await check('Host disconnect retains shared entry and core until full uninstall', async () => {
    const result = published('disconnect Codex', 'aimship@0.1.0-preview.17', fresh, ['uninstall', '--host', 'codex']);
    assert.equal(result.coreRetained, true); assert.deepEqual([...result.remainingHosts].sort(), ['claude-code', 'cursor']);
    assert.equal(await exists(path.join(fresh, '.agents/skills/aimship/SKILL.md')), true);
    const next = published('disconnect Cursor', 'aimship@0.1.0-preview.17', fresh, ['uninstall', '--host', 'cursor']);
    assert.equal(next.coreRetained, true); assert.deepEqual(next.remainingHosts, ['claude-code']);
    assert.equal(await exists(path.join(fresh, '.agents/skills/aimship/SKILL.md')), false);
    assert.equal(launcher('remaining host status', fresh, ['status']).healthy, true);
  });
  await check('Full uninstall removes managed software and retains user content', () => removeAll(fresh, freshRetained));

  const upgrade = path.join(sandbox, 'upgrade home');
  const dataRoot = path.join(sandbox, 'chosen delivery materials');
  let upgradeRetained;
  await check('Install real .16 with custom data root and create synthetic CLI state', async () => {
    published('install .16', 'aimship@0.1.0-preview.16', upgrade, ['install', '--host', 'codex', '--host', 'cursor', '--host', 'claude-code', '--data-root', dataRoot]);
    await healthy(upgrade, '0.1.0-preview.16');
    upgradeRetained = await retainedFiles(upgrade, dataRoot);
    const delivery = path.join(dataRoot, 'order export');
    // .16 predates .17's .aimship/init.md initialization record.
    await fs.mkdir(path.join(delivery, 'source'), { recursive: true });
    const request = path.join(delivery, 'source/request.md');
    await fs.writeFile(request, 'Synthetic request: export filtered orders.');
    const state = launcher('CLI init .16', upgrade, ['init', delivery, '--rules-version', '0.1.0-preview.16', '--input', '-'], { language: 'en', goal: { summary: 'Export filtered orders' }, stageRuns: [{ id: 'requirements', stage: 'requirements', scope: 'Clarify export columns', progress: 'active', inputRefs: ['source/request.md'], outputRefs: [] }], currentRun: 'requirements' });
    const updated = launcher('CLI state update .16', upgrade, ['update', delivery, '--revision', String(state.revision), '--rules-version', '0.1.0-preview.16', '--input', '-'], { next: { action: 'Clarify export columns' } });
    assert.equal(updated.revision, state.revision + 1);
    const resumed = launcher('CLI separate-process resume .16', upgrade, ['resume', delivery, '--rules-version', '0.1.0-preview.16']);
    assert.equal(resumed.state.deliveryId, state.deliveryId); assert.equal(resumed.canProceed, true);
    for (const file of [request, path.join(delivery, '.aimship/state.json'), path.join(delivery, 'status.md')]) upgradeRetained.set(file, await fs.readFile(file));
    return { deliveryId: state.deliveryId, revision: updated.revision, separateProcessResume: true };
  });
  await check('Real .16 to .17 upgrade preserves config, registration, delivery and state bytes', async () => {
    const result = published('upgrade .16 to .17', 'aimship@0.1.0-preview.17', upgrade, ['install']);
    assert.equal(result.action, 'upgrade'); assert.equal(result.fromVersion, '0.1.0-preview.16'); assert.equal(result.toVersion, '0.1.0-preview.17');
    await assertRetained(upgradeRetained);
    assert.equal(launcher('custom root after upgrade', upgrade, ['bind']).dataRoot, dataRoot);
    return healthy(upgrade, '0.1.0-preview.17');
  });
  await check('Uninstall upgraded installation retains pre-upgrade delivery bytes', () => removeAll(upgrade, upgradeRetained));
  const offline = path.join(sandbox, 'offline home');
  await check('Downloaded .17 tarball installs offline from a path containing spaces', async () => {
    published('offline archive install', `file:${packages.get('0.1.0-preview.17').archive}`, offline, ['install', '--host', 'codex', '--host', 'cursor', '--host', 'claude-code'], true);
    return healthy(offline, '0.1.0-preview.17');
  });
  await check('Uninstall offline archive installation', () => removeAll(offline, new Map()));
  report.result = 'passed';
} catch (error) {
  report.result = 'failed'; report.error = error.stack; process.exitCode = 1; console.error(error);
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  // Only this harness's disposable material is removed; command evidence remains.
  await fs.rm(sandbox, { recursive: true, force: true });
}
