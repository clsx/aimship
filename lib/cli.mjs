import { pathToFileURL } from 'node:url';
import { text } from './language.mjs';
import { scanDeliveries } from './discovery.mjs';
import { inspectDocuments } from './documents.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exists, fail, noSymlinks, readJSON } from './io.mjs';
import { install, installPaths, installationStatus, installationVersion, readConfig, uninstall } from './install.mjs';
import { SCHEMA_VERSION, STAGES, renderState, assertInstallationComplete, assertRules, checkReferences, initState, readState, recoverState, updateState, validateState } from './state.mjs';

const HELP = {
  usage: 'node <aimship.mjs> <command> [delivery-directory] [options]',
  commands: {
    render: 'render <dir> --revision <N> --rules-version <version> [--preserve-edits]. Explicitly rebuild status.md; preserve manual edits before replacement. Does not replay a state update.',
    scan: 'scan <material-root>. Read immediate delivery directories at .aimship/state.json, deduplicate IDs and report conflicts or invalid records. No global search or write.',
    status: 'status [--home <dir>]. Read only Aimship-managed paths and fixed entries. Report registration, shared entry presence/integrity, active version, pending work and config problems. Host loading, login and access permissions remain unverified; no directories are created.',
    bind: 'Resolve active installation once. Returns immutable release/core/stage/CLI paths plus configured dataRoot, configPath and customPath. Source mode returns the default data root with null config/custom paths. No directories are created. Optional --home is for isolated testing.',
    init: 'init <dir> --input <json-file|-> --rules-version <version>. Create state once; input requires goal.summary, language (en or zh-CN) and saved .aimship/init.md; directory must be a child of bound dataRoot unless storage has an explicit local decisionRef; endpoint defaults to standard delivery; artifact conditions may remain null (unknown). Does not create templates.',
    read: 'read <dir> [--rules-version <version>] [--delivery-id <known-id>]. Read current delivery state without executing work.',
    update: 'update <dir> --revision <N> --rules-version <version> --input <json-file|->. Recursively merge objects; arrays replace in full. Identity/history fields are managed. null is a literal value, not deletion.',
    check: 'check <dir> [--rules-version <version>] [--all]. Check structure and current input references (or every registered reference). Checks ordinary Markdown sections and searchable numbers in new local Markdown; reused and unsupported fragments are explicitly not checked. Does not prove semantics, remote access or validation results.',
    resume: 'resume <dir> [--rules-version <version>] [--delivery-id <known-id>]. Read state and return fixed rule paths, required inputs, warnings, and continuation text; never execute work or rewrite state.',
    recover: 'recover <dir> --revision <backup-revision> --rules-version <version>. Restore state.previous.json only over missing/corrupt state; preserve corrupted bytes. Inspect actual artifacts afterward; nothing reruns.',
    install: 'install --host <codex|cursor|claude-code> [--host ...] [--data-root <dir>] [--home <dir>]. Explicitly copy the whole release into .aimship. Repeated installs retain registered hosts. Installed tools default to their owning home; explicit --home overrides it for isolated testing. Data root is configured, never created.',
    uninstall: 'uninstall [--host <host> ...] [--home <dir>]. --host disconnects selected hosts, retaining shared core even when no hosts remain. Omit --host for full product uninstall. Delivery data, config, custom and modified/unowned files are retained. Installed tools default to their owning home; explicit --home overrides it.',
    help: 'help [command]. Every command supports --help. --version reports the executing tool version and installed active version separately. install is the only installation/update entry; update modifies delivery state.'
  },
  stateProtocol: {
    schemaVersion: SCHEMA_VERSION,
    documentReview: {reviewPolicy:1, reviewHistory:'Append-only {id,kind,document,version,digest,sourceRef,summary}. self-check requires result: passed|failed; approved requires decision: explicit-approval; editorial requires previousDigest. Read review.documents for current digests. Tools validate records, not user identity. See docs/cli.md#document-review-protocol.'},
    deliveryPolicy: 'New states default to {version:1}; partialRef identifies an explicitly limited scope, null restores standard scope with a new goal decision. Completion is derived separately from goal/acceptance.',
    sessions: 'run.sessionGroup is an advisory context group, auto-filled for new runs; reviewOf names implementation runs and overall:true identifies overall review. read/check/resume expose session/completion. Supplied PRD/prototype mode input uses the actual request basisRef and self-check, not human approval. next.questionRef identifies a concrete question on a blocked stage (clear with null). Completed stages return stop with await-review, await-clarification or await-continue, even within one group; suggestNewSession is advisory. Failed view saving returns reconcile-save. No new approval or automatic execution.',
    stages: STAGES,
    progress: ['planned', 'active', 'blocked', 'done'],
    result: ['passed', 'failed', 'not-run', 'unknown', 'mixed'],
    applicability: ['current', 'needs-review', 'unknown'],
    outcome: { goal: ['in-progress', 'met', 'not-met', 'unknown'], acceptance: ['not-recorded', 'accepted', 'declined', 'unknown'] },
    stageInstance: { id: 'stable-instance-id', stage: '<stage>', scope: 'batch or whole-delivery scope', progress: 'planned', inputRefs: [], outputRefs: [], resultRef: 'review.md#REV-001 (required when done)' },
    references: 'delivery-relative/path#optional-fragment, repo:<registered-id>/<repo-relative-path>#fragment, or HTTP(S) URL. Local paths cannot escape their root. Repository registration: {id, path: absolute-path, role}.',
    topLevel: {
      managed: 'schemaVersion, revision, deliveryId, rulesVersion, createdAt, updatedAt, goalHistory, documentDigests, writeResult. Do not supply these in init/update.',
      requiredInit: 'language: en|zh-CN and goal: {summary, endpoint?}; save nonempty initialization notes in .aimship/init.md before init. Defaults: endpoint standard delivery, goalRef .aimship/init.md, empty documents, and null documentPolicy conditions/authority. Register PRD and switch goalRef when drafted; no empty templates.',
      language: 'en or zh-CN from explicit user preference, otherwise this delivery conversation. Required in current state; retained on update/render/resume.',
      storage: 'Init-only {mode: explicit, decisionRef: delivery-relative-readable-file} for a user-selected location. Otherwise a strict child of configured dataRoot. Returned dataRoot is managed; ordinary workspace/material location is not a choice.',
      stageRuns: 'Ordered array of stageInstance objects, default []. Every ID is unique; currentRun must match one of these IDs or be null. Stage types may repeat with distinct IDs.',
      currentRun: 'Instance ID or null (default). Do not invent an ID without registering its instance in stageRuns.',
      repositories: 'Array of {id, path: absolute-path, role, ...optional-version-facts}, default []. No repository is required for a design-only goal.',
      openChanges: 'Array of {id, ref, status: open|closed}, default []; close records rather than deleting history.',
      outcome: 'Defaults to {goal: in-progress, acceptance: not-recorded}. A met goal needs goalConclusionRef; recorded acceptance needs acceptanceRef. Optional handoffRef, mergeRef, deploymentRef retain independent facts.',
      next: '{action, inputRefs?: []}; defaults to continuing the confirmed arrangement.',
      cycle: 'Positive integer, default 1. A reopening increments by one, appends a closureRef and resets current acceptance.',
      closureRefs: 'Historical closure references, default []. Preserve them across reopenings.'
    },
    minimalInit: {
      language: 'en',
      goal: { summary: 'Export the currently filtered orders' },
      goalRef: '.aimship/init.md',
      documentPolicy: {authority:null,interaction:null,prototypeCovered:null,interface:null,databases:null},
      documents: [],
      stageRuns: [{ id: 'requirements-1', stage: 'requirements', scope: 'Clarify order export', progress: 'active', inputRefs: ['.aimship/init.md'], outputRefs: [] }],
      currentRun: 'requirements-1',
      next: { action: 'Clarify export fields and acceptance criteria', inputRefs: ['.aimship/init.md'] }
    },
    safety: 'Done is execution progress only. Results, applicability, goal attainment, acceptance, merge, and deployment are independent. Preserve old result references with priorResultRef/historyResultRefs. Goal revision needs a new goal.decisionRef; prior goals are retained automatically.'
  }
};
function parse(argv) {
  const positional = []; const options = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith('--')) { positional.push(item); continue; }
    const name = item.slice(2);
    if (!['help', 'version', 'all', 'preserve-edits', 'input', 'rules-version', 'delivery-id', 'revision', 'host', 'home', 'data-root'].includes(name)) fail('USAGE', `Unknown option: ${item}`, 'Run help for command usage.');
    const value = ['help', 'version', 'all', 'preserve-edits'].includes(name) ? true : argv[++i];
    if (value === undefined || (typeof value === 'string' && value.startsWith('--'))) fail('USAGE', `Missing value for ${item}`, 'Provide the option value.');
    if (name === 'host') (options.hosts ??= []).push(value);
    else { if (Object.hasOwn(options, name)) fail('USAGE', `Repeated option: ${item}`, 'Provide one value; only --host is repeatable.'); options[name] = value; }
  }
  return { positional, options };
}
async function inputJSON(file) {
  if (!file) fail('USAGE', '--input is required.', 'Use a JSON file or --input - to read stdin.');
  if (file !== '-') return readJSON(path.resolve(file));
  try { let raw = ''; for await (const chunk of process.stdin) raw += chunk; return JSON.parse(raw); } catch (e) { fail('INVALID_JSON', 'Cannot parse JSON from stdin.', 'Provide one valid JSON object.', { cause: e.message }); }
}
function revisionOf(value) {
  if (!/^(0|[1-9][0-9]*)$/.test(value ?? '') || !Number.isSafeInteger(Number(value))) fail('USAGE', '--revision requires a nonnegative integer.', 'Use the exact revision returned by read (backup revision for recover).');
  return Number(value);
}
function installedRoot(sourceRoot) { return path.basename(path.dirname(sourceRoot)) === 'releases' ? path.dirname(path.dirname(sourceRoot)) : null; }
async function runtimeFor(sourceRoot, options, explicitRoot) {
  const pkg = await readJSON(path.join(sourceRoot, 'package.json'));
  const root = explicitRoot ?? installedRoot(sourceRoot) ?? (options.home ? installPaths(options.home).root : null);
  let activeVersion = pkg.version;
  let installPending = null;
  if (root) {
    const manifest = await readJSON(path.join(root, 'install-manifest.json'));
    if (manifest.schemaVersion !== 1 || manifest.product !== 'aimship') fail('INSTALL_FORMAT', 'Unknown installation manifest.', 'Use a compatible installer.');
    installPending = manifest.pending ?? null;
    if (await exists(path.join(root, 'active.json'))) {
      const active = await readJSON(path.join(root, 'active.json'));
      if (active.launcherProtocol !== 1 || typeof active.version !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(active.version)) fail('INSTALL_FORMAT', 'Active pointer has an unsupported protocol or version.', 'Reinstall the exact complete package.');
      activeVersion = active.version;
    } else if (!installPending) fail('NOT_INSTALLED', 'No active installation exists.', 'Install the exact package explicitly.');
  }
  return { version: pkg.version, activeVersion, installPending, releaseRoot: sourceRoot, installRoot: root, launcher: root ? path.join(root, 'bin', 'aimship.mjs') : path.join(sourceRoot, 'bin', 'aimship.mjs') };
}
async function binding(runtime) {
  assertInstallationComplete(runtime);
  const root = runtime.installRoot ? path.join(runtime.installRoot, 'releases', runtime.activeVersion) : runtime.releaseRoot;
  await noSymlinks(root);
  const pkg = await readJSON(path.join(root, 'package.json'));
  if (pkg.version !== runtime.activeVersion) fail('RELEASE_CONFLICT', 'Active pointer and release package version differ.', 'Repair installation before continuing.');
  const corePath = path.join(root, 'skills', 'aimship', 'references', 'core.md');
  if (!await exists(corePath)) fail('INCOMPLETE_RELEASE', 'The bound core is missing.', 'Repair the exact installation before continuing.');
  const configPath = runtime.installRoot ? path.join(runtime.installRoot, 'config.json') : null;
  let dataRoot = path.join(os.homedir(), 'Aimship');
  if (configPath) {
    dataRoot = (await readConfig(configPath)).dataRoot;
  }
  const protocolPath=path.join(root,'lib/state.mjs'); await noSymlinks(protocolPath);
  const targetProtocol = await import(pathToFileURL(protocolPath).href);
  if (!Number.isSafeInteger(targetProtocol.SCHEMA_VERSION) || targetProtocol.SCHEMA_VERSION<1) fail('INCOMPLETE_RELEASE','Bound release does not export its state protocol.','Repair the exact release before creating state.');
  return { version: pkg.version, schemaVersion: targetProtocol.SCHEMA_VERSION, toolVersion:runtime.version, toolSchemaVersion:SCHEMA_VERSION, launcherProtocol: 1, releaseRoot: root, corePath, stageDirectory: path.join(root, 'skills', 'aimship', 'references', 'stages'), cliPath: path.join(root, 'bin', 'aimship.mjs'), launcherPath: runtime.launcher, nodePath: process.execPath, dataRoot, configPath, customPath: runtime.installRoot ? path.join(runtime.installRoot, 'custom') : null, configurationStatus: runtime.installRoot ? 'installed' : 'source-default' };
}
function allowed(command, options) {
  const common = ['help', 'version'];
  const perCommand = { render: ['revision','rules-version','preserve-edits','home'], scan:['home'], status: ['home'], bind: ['home'], init: ['input', 'rules-version', 'home'], read: ['rules-version', 'delivery-id', 'home'], update: ['input', 'rules-version', 'revision', 'home'], check: ['all', 'rules-version', 'home'], resume: ['rules-version', 'delivery-id', 'home'], recover: ['rules-version', 'revision', 'home'], install: ['hosts', 'home', 'data-root'], uninstall: ['hosts', 'home'], help: [] };
  for (const key of Object.keys(options)) if (![...common, ...(perCommand[command] ?? [])].includes(key)) fail('USAGE', `Option --${key} is not valid for ${command}.`, `Run help ${command}.`);
}
export async function run(argv, context) {
  if (Number(process.versions.node.split('.')[0]) < 22) fail('NODE_VERSION', 'Aimship requires Node.js 22 or later.', 'Install a maintained Node LTS release and rerun this exact package.');
  const { positional, options } = parse(argv); const command = positional[0] ?? 'help';
  const pkg = await readJSON(path.join(context.sourceRoot, 'package.json'));
  const owningInstallRoot = context.installRoot ?? installedRoot(context.sourceRoot);
  const installHome = options.home ?? (owningInstallRoot ? path.dirname(owningInstallRoot) : undefined);
  if (options.version) {
    const installed = await installationVersion({ home: installHome });
    return { command: 'version', data: { version: pkg.version, toolVersion: pkg.version, installedActiveVersion: installed.installedActiveVersion, installation: installed.installation, pendingVersion: installed.pending?.version ?? null, node: process.version, integrity: 'Use status for managed-file and config integrity; host loading, login and permissions are not verified.', issues: [installed.manifest.error, installed.active.error].filter(Boolean) } };
  }
  if (command === 'help' || options.help) {
    const subject = command === 'help' ? positional[1] : command;
    if (subject && !HELP.commands[subject]) fail('USAGE', `Unknown command: ${subject}`, 'Run help.');
    return { command: 'help', data: subject ? { usage: HELP.commands[subject], stateProtocol: HELP.stateProtocol } : HELP };
  }
  if (!HELP.commands[command]) fail('USAGE', `Unknown command: ${command}`, 'Run help.');
  allowed(command, options);
  if (['install', 'uninstall', 'bind', 'status'].includes(command) ? positional.length !== 1 : positional.length !== 2) fail('USAGE', 'Unexpected or missing positional arguments.', `Run help ${command}.`);
  if (command === 'status') return { command, data: { toolVersion: pkg.version, ...await installationStatus({ home: installHome }) } };
  if (command === 'install') return { command, data: await install(context.sourceRoot, { home: installHome, hosts: options.hosts, dataRoot: options['data-root'] }) };
  if (command === 'uninstall') return { command, data: await uninstall({ home: installHome, hosts: options.hosts }) };
  if (command === 'scan') return {command,data:await scanDeliveries(path.resolve(positional[1]))};
  const runtime = await runtimeFor(context.sourceRoot, options, context.installRoot);
  if (command === 'bind') return { command, data: await binding(runtime) };
  const directory = path.resolve(positional[1]); const rulesVersion = options['rules-version'];
  if (command === 'render') return {command,data:await renderState(directory,revisionOf(options.revision),rulesVersion,runtime,options['preserve-edits'])};
  if (command === 'init') {
    const bound=await binding(runtime);
    return { command, data: await initState(directory,await inputJSON(options.input),rulesVersion,{...runtime,dataRoot:bound.dataRoot}) };
  }
  if (command === 'update') return { command, data: await updateState(directory, await inputJSON(options.input), revisionOf(options.revision), rulesVersion, runtime) };
  if (command === 'recover') return { command, data: await recoverState(directory, revisionOf(options.revision), rulesVersion, runtime) };
  const read = await readState(directory);
  if (options['delivery-id'] && options['delivery-id'] !== read.state.deliveryId) fail('DELIVERY_ID_MISMATCH','This directory is not the bound delivery.','Locate the intended delivery; do not guess the latest one.');
  let mismatch = null;
  try { assertRules(read.state, rulesVersion, runtime); } catch (error) { mismatch = { code: error.code, ...error.details, recovery: error.recovery }; }
  if (command === 'read') return { command, data: { state: read.state, readOnly: read.readOnly, versionMismatch: mismatch, statePath: read.statePath, review:read.review, completion:read.completion, session:read.session, view: read.view, documentChanges: read.documentChanges } };
  validateState(read.state); const references = await checkReferences(directory, read.state, options.all);
  const documents=await inspectDocuments(directory,read.state);
  const missing = references.filter(x => !['exists', 'not-checked'].includes(x.status));
  if (command === 'check') {
    if (missing.length) fail('REFERENCE_CHECK', 'Required references are missing or inaccessible.', 'Repair the specific registered paths; do not scan the disk or overwrite source materials.', { references, versionMismatch: mismatch });
    if (mismatch) fail('VERSION_MISMATCH', 'State is structurally valid, but rules are not bound consistently.', mismatch.recovery, mismatch);
    if (documents.issues.length) fail('DOCUMENT_CHECK','Document mapping or identities need repair.','Inspect listed issues.',documents);
    return { command, data: { structure: 'valid', review:read.review, completion:read.completion, session:read.session, references, documents, view:read.view, documentChanges:read.documentChanges, semantics: 'not-checked' } };
  }
  const currentRun = read.state.stageRuns.find(x => x.id === read.state.currentRun) ?? null;
  const blocked = currentRun?.progress === 'blocked';
  return { command, data: { state: read.state, binding: await binding(runtime), readOnly: false, review:read.review, completion:read.completion, session:read.session, canProceed: read.review.canProceed && !mismatch && missing.length === 0 && !blocked && !documents.issues.length && !read.documentChanges.length && read.view.status === 'current', statePath:read.statePath, view:read.view, documentChanges:read.documentChanges, documents, versionMismatch: mismatch, references, currentRun, continuation: !mismatch && !missing.length && !documents.issues.length ? read.session?.continuation ?? null : null, warnings: [text(read.state,'Resume does not rerun work, tests, migrations, or other side effects.','续接不会重新执行工作、测试、迁移或其他外部操作。'), text(read.state,'Structural readiness does not establish authorization, business readiness, or goal completion.','结构检查就绪不代表已获得授权、业务已就绪或目标已完成。'), ...(blocked ? [text(read.state,`Current run ${currentRun.id} is recorded as blocked. Resolve its documented blocker before progressing this work.`,`当前工作 ${currentRun.id} 已记录为受阻，请先处理已记录的阻塞原因。`)] : []), ...(missing.length ? [text(read.state,'Some required paths must be repaired.','部分必要路径需要修复。')] : [])] } };
}
