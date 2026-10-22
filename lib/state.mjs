import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite, exists, fail, inside, json, noSymlinks, readJSON, withLock } from './io.mjs';

export const SCHEMA_VERSION = 1;
export const STAGES = ['frame', 'requirements', 'prototype', 'scope', 'diagnose', 'tech-design', 'contract', 'plan', 'test-design', 'implement', 'review', 'verify', 'handoff'];
const PROGRESS = ['planned', 'active', 'blocked', 'done'];
const RESULTS = ['passed', 'failed', 'not-run', 'unknown', 'mixed'];
const OUTCOME_REFS = ['goalConclusionRef', 'acceptanceRef', 'mergeRef', 'deploymentRef', 'handoffRef'];
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const string = x => typeof x === 'string' && x.trim().length > 0;
function requireThat(condition, message) { if (!condition) fail('INVALID_STATE', message, 'Correct the input without overwriting the current state; read help for the state protocol.'); }
function ref(value, field) {
  requireThat(string(value), `${field} must be a nonempty reference string.`);
  requireThat(!value.includes('\0'), `${field} contains a null byte.`);
  if (/^https?:\/\//.test(value)) { try { new URL(value); } catch { requireThat(false, `${field} is not a URL.`); } return; }
  requireThat(!value.includes('\\') && (!value.startsWith('repo:') || /^repo:[^/#]+\/.+/.test(value)), `${field} must use slash-separated relative paths and a valid repository ID.`);
  const local = value.replace(/^repo:[^/]+\//, '').split('#')[0];
  requireThat(string(local) && !path.isAbsolute(local) && !/^[a-zA-Z]:/.test(local) && !local.split(/[\\/]/).includes('..'), `${field} must be delivery-relative, repo:<id>/<path>, or an HTTP(S) URL.`);
}
function refs(value, field) { requireThat(Array.isArray(value), `${field} must be an array.`); value.forEach(x => ref(x, field)); }
function unique(items, label) { requireThat(items.every(object), `${label} entries must be objects.`); const ids = items.map(x => x.id); requireThat(ids.every(string) && new Set(ids).size === ids.length, `${label} IDs must be nonempty and unique.`); }

export function validateState(state) {
  requireThat(object(state), 'State must be an object.');
  if (state.schemaVersion !== SCHEMA_VERSION) fail('UNKNOWN_SCHEMA', `Schema ${state.schemaVersion} is read-only for this tool.`, 'Preserve the file and use a compatible tool or an explicit, reviewed migration.');
  requireThat(Number.isSafeInteger(state.revision) && state.revision >= 0, 'revision must be a nonnegative integer.');
  requireThat(string(state.deliveryId) && string(state.rulesVersion), 'deliveryId and rulesVersion are required.');
  requireThat(object(state.goal) && string(state.goal.summary) && string(state.goal.endpoint), 'goal.summary and goal.endpoint are required.');
  ref(state.goalRef, 'goalRef');
  if (state.goal.decisionRef !== undefined) ref(state.goal.decisionRef, 'goal.decisionRef');
  requireThat(Number.isSafeInteger(state.cycle) && state.cycle >= 1, 'cycle must be a positive integer.');
  refs(state.closureRefs, 'closureRefs');
  requireThat(Array.isArray(state.stageRuns), 'stageRuns must be an array.'); unique(state.stageRuns, 'Stage instance');
  for (const run of state.stageRuns) {
    requireThat(STAGES.includes(run.stage), `Unknown stage: ${run.stage}`);
    requireThat(string(run.scope) && PROGRESS.includes(run.progress), `Invalid scope or progress in ${run.id}.`);
    refs(run.inputRefs, `${run.id}.inputRefs`); refs(run.outputRefs, `${run.id}.outputRefs`);
    for (const key of ['resultRef', 'priorResultRef']) if (run[key] !== undefined) ref(run[key], `${run.id}.${key}`);
    if (run.historyResultRefs !== undefined) refs(run.historyResultRefs, `${run.id}.historyResultRefs`);
    if (run.result !== undefined) requireThat(RESULTS.includes(run.result), `Invalid result in ${run.id}.`);
    if (run.applicability !== undefined) requireThat(['current', 'needs-review', 'unknown'].includes(run.applicability), `Invalid applicability in ${run.id}.`);
    if (run.progress === 'done') requireThat(string(run.resultRef), `Completed instance ${run.id} requires resultRef; file existence does not establish semantic completion.`);
  }
  requireThat(state.currentRun === null || state.stageRuns.some(x => x.id === state.currentRun), 'currentRun must refer to a stage instance or be null.');
  requireThat(Array.isArray(state.openChanges), 'openChanges must be an array.'); unique(state.openChanges, 'Change');
  for (const change of state.openChanges) { ref(change.ref, 'change.ref'); requireThat(['open', 'closed'].includes(change.status), 'Invalid change status.'); }
  requireThat(Array.isArray(state.repositories), 'repositories must be an array.'); unique(state.repositories, 'Repository');
  for (const repo of state.repositories) requireThat(path.isAbsolute(repo.path ?? '') && string(repo.role), 'Repository path must be absolute and role nonempty.');
  requireThat(object(state.outcome) && ['in-progress', 'met', 'not-met', 'unknown'].includes(state.outcome.goal), 'Invalid outcome.goal.');
  requireThat(['not-recorded', 'accepted', 'declined', 'unknown'].includes(state.outcome.acceptance), 'Invalid outcome.acceptance.');
  for (const key of OUTCOME_REFS) if (state.outcome[key] !== undefined) ref(state.outcome[key], `outcome.${key}`);
  if (state.outcome.goal === 'met') requireThat(string(state.outcome.goalConclusionRef), 'A met goal requires an explicit goalConclusionRef.');
  if (['accepted', 'declined'].includes(state.outcome.acceptance)) requireThat(string(state.outcome.acceptanceRef), 'Acceptance requires a separate decision reference.');
  requireThat(object(state.next) && string(state.next.action), 'next.action is required.');
  if (state.next.inputRefs !== undefined) refs(state.next.inputRefs, 'next.inputRefs');
  if (state.goalHistory !== undefined) requireThat(Array.isArray(state.goalHistory), 'goalHistory must be an array.');
  if (state.rulesHistory !== undefined) requireThat(Array.isArray(state.rulesHistory), 'rulesHistory must be an array.');
  return state;
}

export function statePaths(directory) {
  const dir = path.resolve(directory);
  return { dir, statePath: path.join(dir, 'state.json'), backup: path.join(dir, 'state.previous.json'), lock: path.join(dir, '.state.lock') };
}
export async function readState(directory) {
  const paths = statePaths(directory); const state = await readJSON(paths.statePath);
  requireThat(object(state), 'State must be an object.');
  const readOnly = state.schemaVersion !== SCHEMA_VERSION;
  if (!readOnly) validateState(state);
  return { ...paths, state, readOnly };
}
function checkRevision(state, revision) {
  if (!Number.isSafeInteger(revision) || revision !== state.revision) fail('REVISION_CONFLICT', `Expected revision ${revision}; current revision is ${state.revision}.`, 'Read state again and merge your intended changes; never retry with a guessed revision.', { expected: revision, actual: state.revision });
}
export function assertRules(state, rulesVersion, runtime) {
  assertInstallationComplete(runtime);
  if (!rulesVersion || rulesVersion !== state.rulesVersion || rulesVersion !== runtime.version || runtime.activeVersion !== runtime.version) fail('VERSION_MISMATCH', 'The session, state, tool, and active installation must use the same rules version.', 'Save only unfinished facts with checkpoint if available; bind the active version, reload its core and current stage, then adopt at a stable point.', { session: rulesVersion, state: state.rulesVersion, tool: runtime.version, active: runtime.activeVersion, launcher: runtime.launcher });
}
export function assertInstallationComplete(runtime) {
  if (runtime.installPending) fail('INSTALL_PENDING', 'The installation is incomplete; new workflow writes and bindings are suspended.', 'Read state without progressing, then rerun install from the same exact pending package. After recovery, bind and reload its fixed core before continuing.', { pendingVersion: runtime.installPending.version, activeVersion: runtime.activeVersion, launcher: runtime.launcher });
}
export async function initState(directory, input, rulesVersion, runtime) {
  assertInstallationComplete(runtime);
  if (rulesVersion !== runtime.version || runtime.activeVersion !== runtime.version) fail('VERSION_MISMATCH', 'New delivery requires the active tool and rules version.', 'Bind the current installation and use its returned version.');
  const p = statePaths(directory); await noSymlinks(p.dir); await fs.mkdir(p.dir, { recursive: true });
  return withLock(p.lock, async () => {
    if (await exists(p.statePath)) fail('ALREADY_EXISTS', 'A delivery already exists here.', 'Read/resume this delivery or choose a different folder.');
    const forbidden = ['schemaVersion', 'revision', 'deliveryId', 'rulesVersion', 'createdAt', 'updatedAt', 'goalHistory', 'rulesHistory'];
    requireThat(object(input) && !forbidden.some(x => Object.hasOwn(input, x)), 'init input must not set tool-managed identity/version fields.');
    const now = new Date().toISOString();
    const state = { cycle: 1, closureRefs: [], stageRuns: [], currentRun: null, openChanges: [], repositories: [], outcome: { goal: 'in-progress', acceptance: 'not-recorded' }, next: { action: 'Continue the confirmed arrangement.' }, ...input, schemaVersion: SCHEMA_VERSION, revision: 0, deliveryId: randomUUID(), rulesVersion, createdAt: now, updatedAt: now };
    validateState(state); await atomicWrite(p.statePath, json(state)); return state;
  });
}
function merge(base, patch) {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(patch)) {
    requireThat(!['__proto__', 'constructor', 'prototype'].includes(key), `Unsafe property: ${key}`);
    result[key] = object(value) && object(result[key]) ? merge(result[key], value) : structuredClone(value);
  }
  return result;
}
function retainHistory(previous, next) {
  for (const old of previous.stageRuns) {
    const current = next.stageRuns.find(x => x.id === old.id);
    if (!current) requireThat(old.progress === 'planned' && !old.resultRef, `Cannot remove started instance ${old.id}; preserve historical execution.`);
    else {
      requireThat(current.stage === old.stage, `Cannot change stage type for ${old.id}.`);
      const oldRefs = [old.resultRef, old.priorResultRef, ...(old.historyResultRefs ?? [])].filter(Boolean);
      const currentRefs = [current.resultRef, current.priorResultRef, ...(current.historyResultRefs ?? [])];
      requireThat(oldRefs.every(x => currentRefs.includes(x)), `Preserve historical result references for ${old.id}.`);
    }
  }
  requireThat(previous.closureRefs.every(x => next.closureRefs.includes(x)), 'Preserve historical closure references.');
  requireThat(previous.openChanges.every(old => next.openChanges.some(x => x.id === old.id && x.ref === old.ref)), 'Preserve change records, using closed status when resolved.');
  requireThat(next.cycle >= previous.cycle && next.cycle <= previous.cycle + 1, 'cycle may stay unchanged or increase by one.');
  if (next.cycle > previous.cycle) requireThat(next.closureRefs.length > previous.closureRefs.length && next.outcome.acceptance === 'not-recorded', 'Reopening requires a previous closure reference and reset current acceptance.');
}
export async function updateState(directory, patch, revision, rulesVersion, runtime, mode = 'update') {
  assertInstallationComplete(runtime);
  const p = statePaths(directory);
  return withLock(p.lock, async () => {
    const { state: previous } = await readState(directory); validateState(previous); checkRevision(previous, revision);
    requireThat(object(patch), 'Update input must be an object.');
    if (mode === 'checkpoint') {
      if (rulesVersion !== previous.rulesVersion || runtime.version !== previous.rulesVersion) fail('VERSION_MISMATCH', 'Checkpoint must use the rules already bound to this state.', 'Use the compatible old tool or preserve facts outside state and resume with the active tool.');
      requireThat(Object.keys(patch).every(x => ['next', 'checkpoint'].includes(x)) && object(patch.checkpoint) && string(patch.checkpoint.summary), 'Checkpoint may save only next and checkpoint.summary/ref facts; it cannot complete stages or outcomes.');
      if (runtime.activeVersion === runtime.version) fail('CHECKPOINT_NOT_NEEDED', 'Rules match; use a normal update for unfinished facts.', 'Save current work with update.');
      if (previous.checkpoint?.activeVersion === runtime.activeVersion) fail('CHECKPOINT_ALREADY_SAVED', 'A checkpoint for this active version already exists.', 'Reload active rules and adopt at the recorded stable point.');
      if (patch.checkpoint.ref !== undefined) ref(patch.checkpoint.ref, 'checkpoint.ref');
    } else if (mode === 'adopt') {
      requireThat(runtime.version === runtime.activeVersion && rulesVersion === runtime.version, 'Adoption requires the active rules and tool.');
      requireThat(previous.rulesVersion !== rulesVersion, 'Rules are already adopted; no version change is needed.');
      requireThat(Object.keys(patch).length === 1 && string(patch.compatibilityRef), 'Adoption input must contain only compatibilityRef documenting the stable point and compatibility assessment.');
      ref(patch.compatibilityRef, 'compatibilityRef');
    } else {
      assertRules(previous, rulesVersion, runtime);
    }
    const immutable = ['schemaVersion', 'revision', 'deliveryId', 'rulesVersion', 'createdAt', 'updatedAt', 'goalHistory', 'rulesHistory'];
    requireThat(!immutable.some(x => Object.hasOwn(patch, x)), 'Identity, revision, and historical metadata are tool-managed.');
    let next;
    if (mode === 'adopt') {
      next = { ...previous, rulesVersion, rulesHistory: [...(previous.rulesHistory ?? []), { from: previous.rulesVersion, to: rulesVersion, ref: patch.compatibilityRef, at: new Date().toISOString() }] };
    } else next = merge(previous, patch);
    if (mode === 'checkpoint') next.checkpoint.activeVersion = runtime.activeVersion;
    validateState(next);
    if (JSON.stringify(previous.goal) !== JSON.stringify(next.goal) || previous.goalRef !== next.goalRef) {
      requireThat(string(next.goal.decisionRef) && next.goal.decisionRef !== previous.goal.decisionRef, 'Goal revision requires a new explicit decisionRef; viewing results does not revise a goal.');
      next.goalHistory = [...(previous.goalHistory ?? []), { goal: previous.goal, goalRef: previous.goalRef, outcome: previous.outcome, revision: previous.revision }];
    }
    retainHistory(previous, next); next.revision = previous.revision + 1; next.updatedAt = new Date().toISOString();
    validateState(next); await atomicWrite(p.backup, json(previous)); await atomicWrite(p.statePath, json(next)); return next;
  });
}
export async function recoverState(directory, revision, rulesVersion, runtime) {
  const p = statePaths(directory);
  return withLock(p.lock, async () => {
    const backup = await readJSON(p.backup); validateState(backup); checkRevision(backup, revision); assertRules(backup, rulesVersion, runtime);
    let corruptRevision = backup.revision + 1;
    if (await exists(p.statePath)) {
      const raw = await fs.readFile(p.statePath, 'utf8');
      let parsed; try { parsed = JSON.parse(raw); } catch { /* Corruption is preserved below. */ }
      if (parsed) {
        if (parsed.schemaVersion !== SCHEMA_VERSION) fail('UNKNOWN_SCHEMA', 'Cannot recover over an unknown schema.', 'Use a compatible tool; preserve the newer state.');
        try { validateState(parsed); fail('STATE_VALID', 'Current state is valid; refusing rollback.', 'Use a normal revision-checked update to reconcile facts.'); }
        catch (e) { if (e.code !== 'INVALID_STATE') throw e; }
        if (Number.isSafeInteger(parsed.revision)) corruptRevision = Math.max(corruptRevision, parsed.revision);
      }
      await atomicWrite(path.join(p.dir, `state.corrupt.${randomUUID()}.json`), raw);
    }
    const next = { ...backup, revision: corruptRevision + 1, updatedAt: new Date().toISOString(), recovery: { fromRevision: backup.revision, action: 'Inspect actual artifacts and unfinished effects before proceeding; nothing has been re-executed.' } };
    await atomicWrite(p.statePath, json(next)); return next;
  });
}
export async function checkReferences(directory, state, all = false) {
  const current = state.stageRuns.find(x => x.id === state.currentRun);
  const values = new Set([state.goalRef, ...(state.next.inputRefs ?? []), ...(current?.inputRefs ?? [])]);
  if (all) {
    for (const run of state.stageRuns) { for (const value of [...run.inputRefs, ...run.outputRefs, run.resultRef, run.priorResultRef, ...(run.historyResultRefs ?? [])].filter(Boolean)) values.add(value); }
    state.openChanges.forEach(x => values.add(x.ref)); state.closureRefs.forEach(x => values.add(x));
    const add = value => { if (value !== undefined) { ref(value, 'registered reference'); values.add(value); } };
    const addOutcome = outcome => { for (const key of OUTCOME_REFS) add(outcome?.[key]); };
    add(state.goal.decisionRef); addOutcome(state.outcome);
    for (const history of state.goalHistory ?? []) {
      add(history?.goalRef); add(history?.goal?.decisionRef); addOutcome(history?.outcome);
    }
    for (const history of state.rulesHistory ?? []) add(history?.ref);
    add(state.checkpoint?.ref);
  }
  const results = [];
  for (const value of values) {
    if (/^https?:\/\//.test(value)) { results.push({ ref: value, status: 'not-checked', reason: 'Remote access and adopted version require the host.' }); continue; }
    let base = path.resolve(directory); let relative = value.split('#')[0];
    if (value.startsWith('repo:')) {
      const match = /^repo:([^/]+)\/(.*)$/.exec(relative); const repo = state.repositories.find(x => x.id === match?.[1]);
      if (!repo) { results.push({ ref: value, status: 'missing', reason: 'Repository ID is not registered.' }); continue; }
      base = repo.path; relative = match[2];
    }
    const target = path.resolve(base, relative);
    if (!inside(base, target)) fail('INVALID_REFERENCE', `Reference escapes its root: ${value}`, 'Use a path within its registered root.');
    try {
      const real = await fs.realpath(target); const realBase = await fs.realpath(base);
      if (!inside(realBase, real)) results.push({ ref: value, status: 'outside-root', path: target });
      else { await fs.access(real, fs.constants.R_OK); results.push({ ref: value, status: 'exists', path: target, fragmentChecked: false }); }
    } catch (e) { results.push({ ref: value, status: e.code === 'ENOENT' ? 'missing' : 'inaccessible', path: target, reason: e.code }); }
  }
  return results;
}
