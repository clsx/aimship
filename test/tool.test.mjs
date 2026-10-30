import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { json, exists, readJSON } from '../lib/io.mjs';
import { run } from '../lib/cli.mjs';
import { install, installPaths, uninstall } from '../lib/install.mjs';
import { checkReferences, initState, readState, recoverState, updateState } from '../lib/state.mjs';

const SOURCE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VERSION = JSON.parse(await fs.readFile(path.join(SOURCE, 'package.json'), 'utf8')).version;
const runtime = { version: VERSION, activeVersion: VERSION, launcher: 'local-test-launcher', dataRoot: await fs.realpath(os.tmpdir()) };
async function setup(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-test-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const delivery = path.join(root, 'delivery'); await fs.mkdir(delivery);
  await fs.writeFile(path.join(delivery, 'requirements.md'), '# Original request\nReview existing empty-state repair evidence.\n## scope\nSynthetic explicit review-only commission, not a standard development delivery.\n## decision-2\nSynthetic later decision: conclude the limited design review.\n');
  await fs.mkdir(path.join(delivery,'source')); await fs.mkdir(path.join(delivery,'.aimship'),{recursive:true});await fs.writeFile(path.join(delivery,'.aimship/init.md'),'Original synthetic commission. Synthetic user choice: use this isolated temporary delivery directory.');
  await fs.writeFile(path.join(delivery,'results.md'),'# Reused review records\nHistorical synthetic results.');
  const input = { language:'en', storage:{mode:'explicit',decisionRef:'.aimship/init.md'}, deliveryPolicy:{version:1,partialRef:'requirements.md#scope'}, documentPolicy: {authority:'editable',interaction:false,prototypeCovered:false,interface:'none',databases:[]}, documents:[{kind:'prd',path:'requirements.md',mode:'reused',version:'1',basisRef:'requirements.md'},{kind:'review',path:'results.md',mode:'reused',version:'1',basisRef:'results.md'}], goal: { summary: 'Review empty-state repair evidence', endpoint: 'Independent review conclusion' }, goalRef: 'requirements.md', next: { action: 'Review the existing repair evidence' }, stageRuns: [{ id: 'implement-1', stage: 'review', scope: 'single batch', progress: 'planned', inputRefs: ['requirements.md'], outputRefs: ['results.md'] }], currentRun: 'implement-1' };
  return { root, delivery, input };
}
async function fixture(t, version = VERSION) {
  const { root } = await setup(t); const source = path.join(root, 'source'); await fs.mkdir(source);
  for (const dir of ['bin', 'lib']) await fs.cp(path.join(SOURCE, dir), path.join(source, dir), { recursive: true });
  await fs.mkdir(path.join(source, 'skills/aimship/references'), { recursive: true });
  await fs.copyFile(path.join(SOURCE,'skills/aimship/references/artifact-map.json'),path.join(source,'skills/aimship/references/artifact-map.json'));
  await fs.mkdir(path.join(source, 'skills/aimship/agents'), { recursive: true });
  await fs.writeFile(path.join(source, 'skills/aimship/SKILL.md'), '---\nname: aimship\ndisable-model-invocation: true\n---\nRun "{{AIMSHIP_NODE}}" "{{AIMSHIP_LAUNCHER}}" bind\nRead [core](references/core.md#stages).\n');
  await fs.writeFile(path.join(source, 'skills/aimship/references/core.md'), '# Core\n## Stages\nSynthetic isolated rules.\n');
  await fs.writeFile(path.join(source, 'skills/aimship/agents/openai.yaml'), 'policy:\n  allow_implicit_invocation: false\n');
  await fs.writeFile(path.join(source, 'package.json'), json({ name: 'aimship', version, private: true, type: 'module', files: ['bin/', 'lib/', 'skills/'] }));
  return { root, source, home: path.join(root, 'isolated home') };
}
function cli(file, args, input) {
  const result = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', input, timeout: 60_000 });
  return { ...result, parsed: JSON.parse(result.status === 0 ? result.stdout : result.stderr) };
}

test('revision checks, atomic replacement, one recovery copy and separate outcomes', async t => {
  const { delivery, input } = await setup(t);
  const first = await initState(delivery, input, VERSION, runtime); assert.equal(first.revision, 0);
  await assert.rejects(initState(delivery, input, VERSION, runtime), { code: 'ALREADY_EXISTS' });
  const done = { ...first.stageRuns[0], progress: 'done', resultRef: 'results.md#r-1', result: 'failed', applicability: 'current' };
  const second = await updateState(delivery, { stageRuns: [done], outcome: { goal: 'not-met' } }, 0, VERSION, runtime);
  assert.equal(second.outcome.goal, 'not-met'); assert.equal(second.stageRuns[0].progress, 'done');
  assert.equal((await readJSON(path.join(delivery, '.aimship/state.previous.json'))).revision, 0);
  const bytes = await fs.readFile(path.join(delivery, '.aimship/state.json'), 'utf8');
  await assert.rejects(updateState(delivery, { outcome: { goal: 'met' } }, 0, VERSION, runtime), { code: 'REVISION_CONFLICT' });
  await assert.rejects(updateState(delivery, { outcome: { goal: 'met' } }, 1, VERSION, runtime), { code: 'INVALID_STATE' });
  assert.equal(await fs.readFile(path.join(delivery, '.aimship/state.json'), 'utf8'), bytes);
  await updateState(delivery, { next: { action: 'Review actual failure' } }, 1, VERSION, runtime);
  assert.equal((await readJSON(path.join(delivery, '.aimship/state.previous.json'))).revision, 1);
  assert.equal((await fs.readdir(delivery)).filter(x => x.endsWith('.tmp') || x === '.state.lock').length, 0);
});

test('goal revisions and reopening preserve prior goals, decisions and results', async t => {
  const { delivery, input } = await setup(t); await initState(delivery, input, VERSION, runtime);
  await assert.rejects(updateState(delivery, { goal: { endpoint: 'Design only' } }, 0, VERSION, runtime), { code: 'INVALID_STATE' });
  const revised = await updateState(delivery, { stageRuns: [{...input.stageRuns[0],progress:'done',resultRef:'results.md#r-1'}], deliveryPolicy:{version:1,partialRef:'requirements.md#decision-2'}, goal: { endpoint: 'Design only', decisionRef: 'requirements.md#decision-2' }, outcome: { goal: 'met', goalConclusionRef: 'results.md#h-1', acceptance: 'accepted', acceptanceRef: 'results.md#accepted' } }, 0, VERSION, runtime);
  assert.equal(revised.goalHistory[0].goal.endpoint, input.goal.endpoint);
  const opened = await updateState(delivery, { cycle: 2, closureRefs: ['results.md#h-1'], outcome: { goal: 'in-progress', acceptance: 'not-recorded' } }, 1, VERSION, runtime);
  assert.equal(opened.cycle, 2); assert.equal(opened.goalHistory.length, 1);
  const completed = { ...opened.stageRuns[0], progress: 'done', resultRef: 'results.md#r-1' };
  await updateState(delivery, { stageRuns: [completed] }, 2, VERSION, runtime);
  await assert.rejects(updateState(delivery, { stageRuns: [] }, 3, VERSION, runtime), { code: 'INVALID_STATE' });
  await assert.rejects(updateState(delivery, { stageRuns: [{ ...completed, resultRef: 'results.md#r-2' }] }, 3, VERSION, runtime), { code: 'INVALID_STATE' });
  const preserved = await updateState(delivery, { stageRuns: [{ ...completed, resultRef: 'results.md#r-2', priorResultRef: completed.resultRef }] }, 3, VERSION, runtime);
  assert.equal(preserved.stageRuns[0].priorResultRef, completed.resultRef);
});


test('recovery preserves corrupted bytes, advances revision and never repeats work', async t => {
  const { delivery, input } = await setup(t); await initState(delivery, input, VERSION, runtime);
  await updateState(delivery, { next: { action: 'Saved before external effect' } }, 0, VERSION, runtime);
  await fs.writeFile(path.join(delivery, '.aimship/state.json'), '{interrupted write');
  const restored = await recoverState(delivery, 0, VERSION, runtime); assert.equal(restored.revision, 2);
  assert.equal(restored.stageRuns[0].progress, 'planned');
  const files = await fs.readdir(path.join(delivery,'.aimship')); const corrupt = files.find(x => x.startsWith('state.corrupt.'));
  assert.equal(await fs.readFile(path.join(delivery,'.aimship',corrupt), 'utf8'), '{interrupted write');
  await assert.rejects(recoverState(delivery, 0, VERSION, runtime), { code: 'STATE_VALID' });
});

test('concurrent writes cannot silently overwrite each other', async t => {
  const { delivery, input } = await setup(t); await initState(delivery, input, VERSION, runtime);
  const results = await Promise.allSettled([1, 2].map(n => updateState(delivery, { next: { action: `Writer ${n}` } }, 0, VERSION, runtime)));
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.ok(['LOCKED', 'REVISION_CONFLICT'].includes(results.find(x => x.status === 'rejected').reason.code));
  assert.equal((await readState(delivery)).state.revision, 1);
});

test('references check current inputs, repository paths and remote limitations', async t => {
  const { root, delivery, input } = await setup(t); const repo = path.join(root, 'repo'); await fs.mkdir(repo); await fs.writeFile(path.join(repo, 'api.yaml'), 'openapi: 3.1.0');
  input.repositories = [{ id: 'backend', path: repo, role: 'authorized backend' }];
  input.stageRuns[0].inputRefs.push('repo:backend/api.yaml', 'https://example.invalid/adopted');
  const state = await initState(delivery, input, VERSION, runtime);
  const checked = await checkReferences(delivery, state); assert.equal(checked.filter(x => x.status === 'exists').length, 2); assert.equal(checked.filter(x => x.status === 'not-checked').length, 1);
  await fs.rm(path.join(repo, 'api.yaml')); assert.ok((await checkReferences(delivery, state)).some(x => x.status === 'missing'));
  await assert.rejects(updateState(delivery, { goalRef: '../outside.md', goal: { decisionRef: 'requirements.md#decision' } }, 0, VERSION, runtime), { code: 'INVALID_STATE' });
  await fs.symlink(path.join(root, 'repo'), path.join(delivery, 'escape'), 'dir');
  const escaping = structuredClone(state); escaping.stageRuns[0].inputRefs = ['escape/api.yaml']; await fs.writeFile(path.join(repo, 'api.yaml'), 'x');
  assert.equal((await checkReferences(delivery, escaping)).find(x => x.ref === 'escape/api.yaml').status, 'outside-root');
});

test('all references includes current and historical business decision and outcome evidence', async t => {
  const { delivery, input } = await setup(t);
  const state = await initState(delivery, input, VERSION, runtime);
  const outcomeFields = ['goalConclusionRef', 'acceptanceRef', 'mergeRef', 'deploymentRef', 'handoffRef'];
  state.goal.decisionRef = 'missing-decision.md';
  for (const field of outcomeFields) state.outcome[field] = `missing-current-${field}.md`;
  state.goalHistory = [{ goal: { summary: 'Previous goal', endpoint: 'Previous endpoint', decisionRef: 'missing-historical-decision.md' }, goalRef: 'missing-historical-goal.md', outcome: Object.fromEntries(outcomeFields.map(field => [field, `missing-historical-${field}.md`])), revision: 0 }];
  await fs.writeFile(path.join(delivery, '.aimship/state.json'), json(state));
  assert.ok((await checkReferences(delivery, state)).every(x => ['exists','not-checked'].includes(x.status)));
  const expected = ['missing-decision.md', ...outcomeFields.map(field => `missing-current-${field}.md`), 'missing-historical-decision.md', 'missing-historical-goal.md', ...outcomeFields.map(field => `missing-historical-${field}.md`)];
  await assert.rejects(run(['check', delivery, '--all', '--rules-version', VERSION], { sourceRoot: SOURCE }), error => {
    assert.equal(error.code, 'REFERENCE_CHECK');
    assert.deepEqual(error.details.references.filter(x => x.status === 'missing').map(x => x.ref).sort(), expected.sort());
    return true;
  });
});

test('real CLI stdin, JSON errors and resume are executable and read-only', async t => {
  const { delivery, input } = await setup(t); const file = path.join(SOURCE, 'bin/aimship.mjs');
  const created = cli(file, ['init', delivery, '--rules-version', VERSION, '--input', '-'], json(input)); assert.equal(created.status, 0, created.stderr);
  const before = await fs.readFile(path.join(delivery, '.aimship/state.json'), 'utf8');
  const resumed = cli(file, ['resume', delivery, '--rules-version', VERSION]); assert.equal(resumed.status, 0, resumed.stderr); assert.equal(resumed.parsed.data.canProceed, true);
  assert.equal(await fs.readFile(path.join(delivery, '.aimship/state.json'), 'utf8'), before);
  const bad = cli(file, ['update', delivery, '--revision', '0', '--rules-version', VERSION, '--input', '-'], '{bad'); assert.equal(bad.status, 1); assert.equal(bad.parsed.error.code, 'INVALID_JSON');
  const read = cli(file, ['read', delivery]); assert.equal(read.parsed.data.statePath, path.join(delivery, '.aimship/state.json'));
  assert.equal(cli(file, ['unknown']).parsed.error.code, 'USAGE');
  assert.equal(cli(file, ['help', 'install']).status, 0);
});

test('resume reports current blocked state without globally blocking unrelated work', async t => {
  const { delivery, input } = await setup(t);
  input.openChanges = [{ id: 'unrelated-change', ref: 'requirements.md#unrelated-change', status: 'open' }];
  input.stageRuns.push({ id: 'unrelated-run', stage: 'review', scope: 'Separate documented scope', progress: 'blocked', inputRefs: ['requirements.md'], outputRefs: [] });
  const state = await initState(delivery, input, VERSION, runtime);
  const ready = await run(['resume', delivery, '--rules-version', VERSION], { sourceRoot: SOURCE });
  assert.equal(ready.data.canProceed, true);
  await updateState(delivery, { stageRuns: state.stageRuns.map(run => run.id === state.currentRun ? { ...run, progress: 'blocked' } : run) }, 0, VERSION, runtime);
  const before = await fs.readFile(path.join(delivery, '.aimship/state.json'), 'utf8');
  const resumed = await run(['resume', delivery, '--rules-version', VERSION], { sourceRoot: SOURCE });
  assert.equal(resumed.data.canProceed, false); assert.equal(resumed.data.currentRun.progress, 'blocked');
  assert.ok(resumed.data.warnings.some(warning => warning.includes(state.currentRun) && warning.includes('blocked')));
  assert.ok(resumed.data.warnings.some(warning => warning.includes('does not establish authorization')));
  assert.equal(await fs.readFile(path.join(delivery, '.aimship/state.json'), 'utf8'), before);
});

test('symlink CLI invocation runs main while stable launcher imports it only once', { timeout: 60_000 }, async t => {
  const { source, home, root } = await fixture(t); const entry = path.join(source, 'bin/aimship.mjs'); const symlink = path.join(root, 'aimship');
  await fs.symlink(entry, symlink);
  const installed = cli(symlink, ['install', '--home', home, '--host', 'codex', '--host', 'cursor', '--host', 'claude-code']);
  assert.equal(installed.status, 0, installed.stderr); assert.equal(installed.parsed.ok, true); assert.equal(installed.parsed.command, 'install'); assert.equal(installed.parsed.data.version, VERSION);
  const p = installPaths(home); assert.equal(await exists(p.launcher), true); assert.equal(await exists(path.join(home, '.agents/skills/aimship/SKILL.md')), true); assert.equal(await exists(path.join(home, '.claude/skills/aimship/SKILL.md')), true);
  const bound = cli(p.launcher, ['bind']); assert.equal(bound.status, 0, bound.stderr); assert.equal(bound.parsed.command, 'bind'); assert.equal(bound.parsed.data.version, VERSION);
  // Parsing one JSON object above also rejects accidentally duplicated main output.
  const importer = path.join(root, 'import-only.mjs');
  await fs.writeFile(importer, `const imported = await import(${JSON.stringify(pathToFileURL(entry).href)}); process.stdout.write(JSON.stringify({ imported: typeof imported.main === 'function' }) + '\\n');\n`);
  const imported = cli(importer, []); assert.equal(imported.status, 0, imported.stderr); assert.deepEqual(imported.parsed, { imported: true });
});

test('installation is explicit, isolated, complete, idempotent and cache-independent', async t => {
  const { source, home } = await fixture(t); const p = installPaths(home);
  await assert.rejects(install(source, { home }), { code: 'HOST_REQUIRED' });
  const installed = await install(source, { home, hosts: ['codex', 'cursor', 'claude-code'] }); assert.equal(installed.version, VERSION);
  assert.equal(await exists(path.join(home, 'Aimship')), false);
  const entryPath = path.join(home, '.agents/skills/aimship/SKILL.md'); const entry = await fs.readFile(entryPath, 'utf8');
  assert.ok(entry.includes(p.launcher)); assert.ok(!entry.includes('{{')); assert.ok(!entry.includes('](references/'));
  assert.ok(entry.includes(path.join(p.root, 'releases', VERSION, 'skills/aimship/references/core.md')));
  assert.equal(await exists(path.join(p.root, 'releases', VERSION, 'lib/state.mjs')), true);
  const before = await fs.readFile(p.manifest, 'utf8'); await install(source, { home }); assert.equal(await fs.readFile(p.manifest, 'utf8'), before);
  await fs.rm(source, { recursive: true });
  const bound = cli(p.launcher, ['bind']); assert.equal(bound.status, 0, bound.stderr); assert.equal(bound.parsed.data.version, VERSION); assert.ok(bound.parsed.data.cliPath.startsWith(p.root));
});

test('binding returns the retained custom data root without creating it and rejects invalid config', async t => {
  const { source, home, root } = await fixture(t); const p = installPaths(home); const dataRoot = path.join(root, 'custom material root');
  await install(source, { home, hosts: ['codex'], dataRoot });
  assert.equal(await exists(dataRoot), false);
  const bound = cli(p.launcher, ['bind']); assert.equal(bound.status, 0, bound.stderr);
  assert.equal(bound.parsed.data.dataRoot, dataRoot); assert.equal(bound.parsed.data.configPath, p.config); assert.equal(bound.parsed.data.customPath, path.join(p.root, 'custom')); assert.equal(bound.parsed.data.configurationStatus, 'installed');
  assert.equal(await exists(dataRoot), false);
  const sourceBound = await run(['bind'], { sourceRoot: SOURCE });
  assert.equal(sourceBound.data.dataRoot, path.join(os.homedir(), 'Aimship')); assert.equal(sourceBound.data.configPath, null); assert.equal(sourceBound.data.customPath, null); assert.equal(sourceBound.data.configurationStatus, 'source-default');
  for (const invalid of [{ schemaVersion: 99, dataRoot }, { schemaVersion: 1, dataRoot: 42 }, { schemaVersion: 1, dataRoot: 'relative-root' }]) {
    const bytes = json(invalid); await fs.writeFile(p.config, bytes);
    assert.equal(cli(p.launcher, ['bind']).parsed.error.code, 'CONFIG_FORMAT'); assert.equal(await fs.readFile(p.config, 'utf8'), bytes);
  }
  await fs.writeFile(p.config, '{damaged');
  assert.equal(cli(p.launcher, ['bind']).parsed.error.code, 'CONFIG_READ'); assert.equal(await fs.readFile(p.config, 'utf8'), '{damaged');
  assert.equal(await exists(dataRoot), false);
});

test('foreign entries and modified files are preserved rather than overwritten', async t => {
  const { source, home } = await fixture(t); const entry = path.join(home, '.agents/skills/aimship/SKILL.md'); await fs.mkdir(path.dirname(entry), { recursive: true }); await fs.writeFile(entry, 'Foreign skill');
  await assert.rejects(install(source, { home, hosts: ['codex'] }), { code: 'FOREIGN_FILE' }); assert.equal(await fs.readFile(entry, 'utf8'), 'Foreign skill');
  await fs.rm(entry); await install(source, { home, hosts: ['codex'] }); await fs.writeFile(entry, 'User customization');
  await assert.rejects(install(source, { home }), { code: 'USER_MODIFIED' });
  const result = await uninstall({ home }); assert.ok(result.preserved.includes(entry)); assert.equal(await fs.readFile(entry, 'utf8'), 'User customization');
});

test('incomplete install records pending work and same-version rerun repairs it', async t => {
  const { source, home } = await fixture(t); const p = installPaths(home); await fs.mkdir(p.root, { recursive: true }); await fs.writeFile(p.config, json({ schemaVersion: 99, custom: 'keep' }));
  await assert.rejects(install(source, { home, hosts: ['codex'] }), { code: 'INSTALL_INCOMPLETE' });
  assert.equal((await readJSON(p.manifest)).status, 'pending'); assert.equal(await exists(p.active), false);
  await fs.writeFile(p.config, json({ schemaVersion: 1, dataRoot: path.join(home, 'custom data'), userValue: true }));
  await install(source, { home }); assert.equal((await readJSON(p.manifest)).status, 'complete'); assert.equal((await readJSON(p.config)).userValue, true);
});

test('upgrade failure never mixes new entry references with the old active rules', async t => {
  const { source, home, root } = await fixture(t); const p = installPaths(home);
  await install(source, { home, hosts: ['codex'] });
  const delivery = path.join(root, 'existing-delivery'); await fs.mkdir(delivery); await fs.writeFile(path.join(delivery, 'requirements.md'), '# Goal'); await fs.mkdir(path.join(delivery,'source')); await fs.mkdir(path.join(delivery,'.aimship'),{recursive:true});await fs.writeFile(path.join(delivery,'.aimship/init.md'),'Synthetic goal. Synthetic user choice: use this isolated temporary delivery directory.'); await fs.writeFile(path.join(delivery,'results.md'),'Synthetic results');
  const oldCLI = path.join(p.root, 'releases', VERSION, 'bin/aimship.mjs');
  const input = { language:'en', storage:{mode:'explicit',decisionRef:'.aimship/init.md'}, documentPolicy: {authority:'editable',interaction:false,prototypeCovered:false,interface:'none',databases:[]}, documents:[{kind:'prd',path:'requirements.md',mode:'reused',version:'1',basisRef:'requirements.md'},{kind:'review',path:'results.md',mode:'reused',version:'1',basisRef:'results.md'}], goal: { summary: 'Existing goal', endpoint: 'Verified delivery' }, goalRef: 'requirements.md' };
  assert.equal(cli(oldCLI, ['init', delivery, '--rules-version', VERSION, '--input', '-'], json(input)).status, 0);
  const pkg = await readJSON(path.join(source, 'package.json')); pkg.version = '0.2.0-local.1'; await fs.writeFile(path.join(source, 'package.json'), json(pkg));
  await fs.writeFile(p.config, json({ schemaVersion: 99 }));
  await assert.rejects(install(source, { home }), { code: 'INSTALL_INCOMPLETE' });
  assert.equal((await readJSON(p.active)).version, VERSION);
  assert.ok((await fs.readFile(path.join(home, '.agents/skills/aimship/SKILL.md'), 'utf8')).includes(pkg.version));
  assert.equal(cli(p.launcher, ['bind']).parsed.error.code, 'INSTALL_PENDING');
  assert.equal(cli(oldCLI, ['read', delivery, '--rules-version', VERSION]).parsed.data.versionMismatch.code, 'INSTALL_PENDING');
  assert.equal(cli(oldCLI, ['update', delivery, '--revision', '0', '--rules-version', VERSION, '--input', '-'], '{}').parsed.error.code, 'INSTALL_PENDING');
  assert.equal((await readJSON(path.join(delivery, '.aimship/state.json'))).revision, 0);
  await fs.writeFile(p.config, json({ schemaVersion: 1, dataRoot: path.join(home, 'Aimship') }));
  await install(source, { home });
  assert.equal(cli(p.launcher, ['bind']).parsed.data.version, pkg.version);
});


test('installer manages only current entry paths and retains one bounded recovery release', async t => {
  const {source,home}=await fixture(t); const p=installPaths(home);
  await install(source,{home,hosts:['codex','cursor','claude-code']});
  const manifest=await readJSON(p.manifest);
  assert.ok(Object.keys(manifest.managed).every(f=>f.startsWith('.aimship/')||f.startsWith('.agents/')||f.startsWith('.claude/')));
  const bytes=await fs.readFile(p.manifest);
  manifest.managed['.cursor/skills/aimship/SKILL.md']='a'.repeat(64);await fs.writeFile(p.manifest,json(manifest));
  await assert.rejects(install(source,{home}),{code:'INSTALL_FORMAT'});await fs.writeFile(p.manifest,bytes);
  const pkg=await readJSON(path.join(source,'package.json'));
  for(const version of ['0.2.0-local.1','0.3.0-local.1']) {pkg.version=version;await fs.writeFile(path.join(source,'package.json'),json(pkg));await install(source,{home});}
  assert.equal(await exists(path.join(p.root,'releases',VERSION)),false);
  assert.equal(await exists(path.join(p.root,'releases','0.2.0-local.1')),true);
  assert.equal((await readJSON(p.manifest)).previousVersion,'0.2.0-local.1');
});

test('release conflicts, changed active pointer and symbolic link destinations are protected', async t => {
  const { source, home, root } = await fixture(t); const p = installPaths(home); await install(source, { home, hosts: ['codex'] });
  await fs.appendFile(path.join(source, 'skills/aimship/references/core.md'), 'Changed same version');
  await assert.rejects(install(source, { home }), { code: 'INSTALL_INCOMPLETE' });
  const installedCore = path.join(p.root, 'releases', VERSION, 'skills/aimship/references/core.md'); assert.ok(!(await fs.readFile(installedCore, 'utf8')).includes('Changed'));
  const otherHome = path.join(root, 'symlink-home'); await fs.symlink(home, otherHome, 'dir');
  await assert.rejects(install(source, { home: otherHome, hosts: ['codex'] }), { code: 'SYMLINK' });
  const fresh = await fixture(t); await install(fresh.source, { home: fresh.home, hosts: ['codex'] }); const active = installPaths(fresh.home).active;
  await fs.writeFile(active, json({ version: '9.9.9', launcherProtocol: 1 })); await assert.rejects(install(fresh.source, { home: fresh.home }), { code: 'USER_MODIFIED' });
});

test('installed launcher and release CLI keep their owning home unless explicitly overridden', { timeout: 60_000 }, async t => {
  const { source, home, root } = await fixture(t); const p = installPaths(home); const otherHome = path.join(root, 'second isolated home'); const other = installPaths(otherHome);
  await install(source, { home, hosts: ['codex', 'cursor', 'claude-code'] }); await install(source, { home: otherHome, hosts: ['codex', 'cursor'] });
  const fixedCLI = path.join(p.root, 'releases', VERSION, 'bin/aimship.mjs'); const otherCLI = path.join(other.root, 'releases', VERSION, 'bin/aimship.mjs');
  const dataFile = path.join(home, 'Aimship/my-delivery/requirements.md'); await fs.mkdir(path.dirname(dataFile), { recursive: true }); await fs.writeFile(dataFile, 'Keep this delivery');
  const sentinel = path.join(otherHome, 'Aimship/sentinel.md'); await fs.mkdir(path.dirname(sentinel), { recursive: true }); await fs.writeFile(sentinel, 'Keep second home isolated');
  const otherManifest = await fs.readFile(other.manifest, 'utf8'); const otherActive = await fs.readFile(other.active, 'utf8');
  const launcherInstall = cli(p.launcher, ['install']); assert.equal(launcherInstall.status, 0, launcherInstall.stderr); assert.equal(launcherInstall.parsed.data.home, home);
  const fixedInstall = cli(fixedCLI, ['install']); assert.equal(fixedInstall.status, 0, fixedInstall.stderr); assert.equal(fixedInstall.parsed.data.home, home);
  const fixedPartial = cli(fixedCLI, ['uninstall', '--host', 'cursor']); assert.equal(fixedPartial.status, 0, fixedPartial.stderr); assert.deepEqual(fixedPartial.parsed.data.remainingHosts, ['codex', 'claude-code']); assert.equal(await exists(path.join(home, '.agents/skills/aimship/SKILL.md')), true);
  const restored = cli(p.launcher, ['install', '--host', 'cursor']); assert.equal(restored.status, 0, restored.stderr);
  assert.equal(await fs.readFile(other.manifest, 'utf8'), otherManifest); assert.equal(await fs.readFile(other.active, 'utf8'), otherActive); assert.equal(await fs.readFile(sentinel, 'utf8'), 'Keep second home isolated');
  const ownManifest = await fs.readFile(p.manifest, 'utf8');
  const overriddenInstall = cli(p.launcher, ['install', '--home', otherHome]); assert.equal(overriddenInstall.status, 0, overriddenInstall.stderr); assert.equal(overriddenInstall.parsed.data.home, otherHome); assert.equal(await fs.readFile(p.manifest, 'utf8'), ownManifest);
  const overridden = cli(fixedCLI, ['uninstall', '--home', otherHome, '--host', 'cursor']); assert.equal(overridden.status, 0, overridden.stderr); assert.deepEqual(overridden.parsed.data.remainingHosts, ['codex']); assert.equal(await fs.readFile(p.manifest, 'utf8'), ownManifest);
  const launcherPartial = cli(p.launcher, ['uninstall', '--host', 'cursor']); assert.equal(launcherPartial.status, 0, launcherPartial.stderr); assert.deepEqual(launcherPartial.parsed.data.remainingHosts, ['codex', 'claude-code']); assert.equal(await exists(path.join(home, '.agents/skills/aimship/SKILL.md')), true);
  const full = cli(p.launcher, ['uninstall']); assert.equal(full.status, 0, full.stderr); assert.deepEqual(full.parsed.data.remainingHosts, []); assert.equal(await exists(p.launcher), false); assert.equal(await exists(p.config), true); assert.equal(await fs.readFile(dataFile, 'utf8'), 'Keep this delivery');
  const otherFull = cli(otherCLI, ['uninstall']); assert.equal(otherFull.status, 0, otherFull.stderr); assert.deepEqual(otherFull.parsed.data.remainingHosts, []); assert.equal(await exists(other.launcher), false); assert.equal(await exists(other.config), true); assert.equal(await fs.readFile(sentinel, 'utf8'), 'Keep second home isolated');
});

test('uninstalling one shared host preserves others; full uninstall retains custom/config/data', async t => {
  const { source, home } = await fixture(t); const p = installPaths(home); await install(source, { home, hosts: ['codex', 'cursor', 'claude-code'] });
  const data = path.join(home, 'Aimship/my delivery'); await fs.mkdir(data, { recursive: true }); await fs.writeFile(path.join(data, 'requirements.md'), 'Keep source'); await fs.writeFile(path.join(p.root, 'custom/template.md'), 'Keep customization');
  const partial = await uninstall({ home, hosts: ['codex'] }); assert.deepEqual(partial.remainingHosts, ['cursor', 'claude-code']); assert.equal(await exists(path.join(home, '.agents/skills/aimship/SKILL.md')), true);
  await uninstall({ home }); assert.equal(await exists(p.launcher), false); assert.equal(await exists(p.active), false); assert.equal(await exists(p.config), true); assert.equal(await exists(path.join(data, 'requirements.md')), true); assert.equal(await exists(path.join(p.root, 'custom/template.md')), true);
});
