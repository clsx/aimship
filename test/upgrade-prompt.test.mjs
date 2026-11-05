import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PassThrough, Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { main } from '../bin/aimship.mjs';
import { run } from '../lib/cli.mjs';
import { install, installPaths, releaseFiles } from '../lib/install.mjs';
import { confirmUpgrade } from '../lib/upgrade-prompt.mjs';
import { readJSON, listFiles, hash } from '../lib/io.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = await readJSON(path.join(root, 'package.json'));
async function fixture(t, protocol = 1) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-prompt-')));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  const source = path.join(base, 'old'), home = path.join(base, 'home');
  const { files } = await releaseFiles(root);
  for (const file of Object.keys(files)) {
    const target = path.join(source, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(root, file), target);
  }
  const old = { ...pkg, version: '0.1.0-preview.20', aimship: protocol === null ? null : { protocolVersion: protocol } };
  await fs.writeFile(path.join(source, 'package.json'), JSON.stringify(old));
  await install(source, { home, hosts: ['codex'] });
  const delivery = path.join(home, 'Aimship', 'synthetic');
  await fs.cp(path.join(root, 'test/fixtures/preview-19'), delivery, { recursive: true });
  await fs.writeFile(path.join(home, '.aimship/custom/keep.txt'), 'user customization');
  return { home, source, delivery, paths: installPaths(home) };
}
async function snapshot(home) {
  return Object.fromEntries(await Promise.all((await listFiles(home)).map(async file => [file, hash(await fs.readFile(path.join(home, file)))])));
}
function terminal(answer, flags = {}) {
  const input = new PassThrough(); input.isTTY = true; input.isRaw = false;
  input.setRawMode = value => { input.isRaw = value; };
  let stdout = '', stderr = '', prompts = 0;
  const output = new Writable({ write(chunk, encoding, done) {
    stdout += chunk.toString();
    if (chunk.toString().includes('default: cancel): ')) {
      prompts++;
      setImmediate(() => { if (answer === null) input.end(); else input.write(answer); });
    }
    done();
  } });
  output.isTTY = true;
  const errorOutput = new Writable({ write(chunk, encoding, done) { stderr += chunk.toString(); done(); } });
  errorOutput.isTTY = true;
  if (flags.redirect) ({ input, output, errorOutput })[flags.redirect].isTTY = false;
  return { input, output, errorOutput, stdout: () => stdout, stderr: () => stderr, prompts: () => prompts };
}
const inputs = [['y', 'y\n', true], ['Y', 'Y\n', true], ['trimmed y', ' y \n', true], ['trimmed Y', '\tY \n', true], ['yes', 'yes\n', false], ['no', 'n\n', false], ['other', '继续\n', false], ['whitespace', ' \t \n', false], ['Enter', '\n', false], ['EOF', null, false], ['Ctrl+D', '\x04', false], ['Ctrl+C', '\x03', false]];
for (const [label, answer, accepted] of inputs) test(`terminal upgrade ${label}: ${accepted ? 'accepts' : 'cancels before writes'}`, { timeout: 15_000 }, async t => {
  const c = await fixture(t), before = await snapshot(c.home), term = terminal(answer);
  t.after(() => term.input.destroy());
  const listeners = process.listenerCount('SIGINT');
  await main(['install', '--home', c.home], term);
  assert.equal(term.prompts(), 1); assert.equal(term.stderr(), '');
  assert.equal(process.listenerCount('SIGINT'), listeners); assert.equal(term.input.isRaw, false);
  const text = term.stdout();
  assert.match(text, /本次升级不兼容旧版交付状态/); assert.match(text, /you cannot continue/);
  assert.equal(text.split(pkg.version).length - 1, 1); assert.equal(text.split('0.1.0-preview.20').length - 1, 1);
  assert.doesNotMatch(text, /"ok"|"failed"|developer/);
  assert.equal((await readJSON(c.paths.active)).version, accepted ? pkg.version : '0.1.0-preview.20');
  if (!accepted) {
    assert.match(text, /已取消升级，当前版本保持不变/); assert.match(text, /Upgrade cancelled/);
    assert.deepEqual(await snapshot(c.home), before, 'Every installation and synthetic delivery file remains unchanged, with no residual lock.');
  } else {
    assert.match(text, /Upgrade complete/);
    const after = await snapshot(c.home);
    for (const [file, digest] of Object.entries(before).filter(([file]) => file.startsWith('Aimship/') || file.includes('/custom/'))) assert.equal(after[file], digest);
    await assert.rejects(run(['read', c.delivery], { sourceRoot: root }), { code: 'PROTOCOL_MISMATCH' });
    const state = await readJSON(path.join(c.delivery, '.aimship/state.json'));
    const input = path.join(c.home, 'change.json'); await fs.writeFile(input, '{}');
    await assert.rejects(run(['update', c.delivery, '--revision', String(state.revision), '--rules-version', pkg.version, '--input', input], { sourceRoot: root }), { code: 'PROTOCOL_MISMATCH' });
  }
});

test('unknown compatibility uses unverified wording and cancellation has a normal machine result', async t => {
  const c = await fixture(t, null), before = await snapshot(c.home), term = terminal('no\n');
  t.after(() => term.input.destroy());
  const result = await run(['install', '--home', c.home], { sourceRoot: root, confirmUpgrade: warning => confirmUpgrade(warning, term) });
  assert.equal(result.data.result, 'cancelled'); assert.equal(result.data.upgradeRiskAccepted, false);
  assert.equal(result.data.activeVersion, '0.1.0-preview.20'); assert.equal(result.data.compatibility.status, 'unverified');
  assert.match(term.stdout(), /兼容性尚未确认/); assert.match(term.stdout(), /has not been verified/);
  assert.doesNotMatch(term.stdout(), /本次升级不兼容|is incompatible with/);
  assert.deepEqual(await snapshot(c.home), before);
});

test('process SIGINT and EOF with a partial answer cancel and release input handling', async () => {
  for (const action of ['SIGINT', 'partialEOF']) {
    const term = terminal(undefined), signals = new EventEmitter();
    // Drive this prompt directly without scheduling the terminal helper's answer.
    const output = new PassThrough(); output.resume();
    const promise = confirmUpgrade({ fromVersion: 'old', toVersion: 'new', warningZh: '提示', message: 'Warning' }, { input: term.input, output, signals });
    if (action === 'SIGINT') signals.emit('SIGINT'); else { term.input.write('y'); term.input.end(); }
    assert.equal(await promise, false); assert.equal(signals.listenerCount('SIGINT'), 0); assert.equal(term.input.isRaw, false);
    term.input.destroy(); output.destroy();
  }
});

test('noninteractive CLI keeps JSON, rejects npm yes, never consumes stdin, and explicit acceptance works', { timeout: 15_000 }, async t => {
  const c = await fixture(t), before = await snapshot(c.home);
  const invoke = (args, input = 'y\n') => spawnSync(process.execPath, [path.join(root, 'bin/aimship.mjs'), 'install', '--home', c.home, ...args], { encoding: 'utf8', input, timeout: 10_000, env: { ...process.env, npm_config_yes: 'true' } });
  const blocked = invoke([]); assert.equal(blocked.status, 1); assert.equal(blocked.stdout, '');
  const error = JSON.parse(blocked.stderr).error;
  assert.equal(error.code, 'UPGRADE_CONFIRMATION_REQUIRED'); assert.equal(error.details.result, 'failed');
  assert.equal(error.details.activeVersion, '0.1.0-preview.20'); assert.deepEqual(await snapshot(c.home), before);
  const invalid = invoke(['--yes']); assert.equal(invalid.status, 1); assert.equal(JSON.parse(invalid.stderr).error.code, 'USAGE');
  assert.deepEqual(await snapshot(c.home), before);
  const accepted = invoke(['--accept-upgrade-risk']); assert.equal(accepted.status, 0); assert.equal(accepted.stderr, '');
  const receipt = JSON.parse(accepted.stdout); assert.equal(receipt.ok, true); assert.equal(receipt.data.upgradeRiskAccepted, true); assert.equal(receipt.data.activeVersion, pkg.version);
});

test('any redirected stream disables the prompt and preserves structured errors', async t => {
  const c = await fixture(t), before = await snapshot(c.home), oldExitCode = process.exitCode;
  t.after(() => { process.exitCode = oldExitCode; });
  for (const redirect of ['input', 'output', 'errorOutput']) {
    const term = terminal('y\n', { redirect });
    await main(['install', '--home', c.home], term);
    assert.equal(term.prompts(), 0); assert.equal(process.exitCode, 1);
    assert.equal(JSON.parse(term.stderr()).error.code, 'UPGRADE_CONFIRMATION_REQUIRED');
    assert.deepEqual(await snapshot(c.home), before); term.input.destroy();
  }
});

test('explicit terminal acceptance and compatible updates skip the prompt', async t => {
  for (const protocol of [1, 2, pkg.aimship.protocolVersion]) {
    const c = await fixture(t, protocol), term = terminal(null);
    await main(['install', '--home', c.home, ...(protocol !== pkg.aimship.protocolVersion ? ['--accept-upgrade-risk'] : [])], term);
    assert.equal(term.prompts(), 0); assert.equal(term.stderr(), '');
    assert.equal(JSON.parse(term.stdout()).data.activeVersion, pkg.version); term.input.destroy();
  }
});

test('actual install failure after acceptance remains an error with recovery and pending state', async t => {
  const c = await fixture(t), term = terminal('y\n'), oldExitCode = process.exitCode;
  t.after(() => { process.exitCode = oldExitCode; term.input.destroy(); });
  await fs.writeFile(c.paths.config, 'broken');
  await main(['install', '--home', c.home], term);
  assert.equal(process.exitCode, 1); assert.match(term.stderr(), /Upgrade failed \[INSTALL_INCOMPLETE\]/);
  assert.match(term.stderr(), /CONFIG_READ/); assert.match(term.stderr(), /retry the same exact package/);
  assert.doesNotMatch(term.stdout(), /Upgrade cancelled|Upgrade complete/);
  assert.equal((await readJSON(c.paths.active)).version, '0.1.0-preview.20');
  assert.equal((await readJSON(c.paths.manifest)).pending.upgradeRiskAccepted, true);
});
