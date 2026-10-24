import { isDeepStrictEqual } from 'node:util';
import { artifactMap, safeRead, anchors } from './documents.mjs';
import { fail, hash } from './io.mjs';

const text = value => typeof value === 'string' && value.trim().length > 0;
const reject = message => fail('REVIEW_CHECK', message, 'Read review status. Preserve history, self-check the current document, and record only an actual explicit user decision.');
const kinds = ['self-check', 'approved', 'changes-requested', 'editorial'];
export function validateReviewState(state) {
  if (state.reviewPolicy === undefined) return;
  if (state.reviewPolicy !== 1 || !Array.isArray(state.reviewHistory)) reject('Unsupported review policy or missing reviewHistory.');
  const ids = new Set();
  for (const r of state.reviewHistory) {
    if (!r || !text(r.id) || ids.has(r.id) || !kinds.includes(r.kind) || !text(r.document) || !text(r.version) || !/^[a-f0-9]{64}$/.test(r.digest ?? '') || !text(r.sourceRef) || !text(r.summary)) reject('Review records need unique ID, kind, document, version, digest, sourceRef and summary.');
    ids.add(r.id);
    if (r.kind === 'self-check' && !['passed','failed'].includes(r.result)) reject('Self-check records must distinguish passed from failed.');
    if (r.kind === 'approved' && r.decision !== 'explicit-approval') reject('Approval requires an explicit user approval decision; questions, silence and requests to see results are not approval.');
    if (r.kind === 'editorial' && !/^[a-f0-9]{64}$/.test(r.previousDigest ?? '')) reject('Editorial reconciliation needs the previous approved digest.');
  }
  for (const [index, run] of state.stageRuns.entries()) {
    if (run.dependsOn !== undefined && (!Array.isArray(run.dependsOn) || new Set(run.dependsOn).size !== run.dependsOn.length || !run.dependsOn.every(id => state.stageRuns.slice(0, index).some(r => r.id === id)))) reject(`${run.id}: dependencies must be unique preceding run IDs.`);
  }
}
// Shared execution/result sections are outside the approved design surface.
// Reused formats have no inferred boundary: the entire pinned file is reviewed.
export async function reviewFingerprint(directory, state, doc) {
  const stop = doc.mode === 'new' ? { plan: 'execution', testing: 'runs' }[doc.kind] : null;
  let body = await safeRead(directory, state, doc.path, stop ? 'utf8' : null);
  if (body === null) return null;
  if (stop) {
    const at = body.search(new RegExp(`<a\\s+id=["']${stop}["']\\s*><\\/a>`));
    if (at < 0) return null;
    body = body.slice(0, at);
  }
  const assets = [];
  for (const ref of doc.assetRefs ?? []) { const bytes = await safeRead(directory,state,ref,null); if (bytes === null) return null; assets.push([ref,hash(bytes)]); }
  return hash(assets.length ? JSON.stringify([hash(body),assets]) : body);
}
function decisionFor(state, doc, digest) {
  let approved = null, checked = null, latest = null;
  for (const r of state.reviewHistory ?? []) {
    if (r.document !== doc.path) continue;
    if (r.kind === 'changes-requested') { approved = null; checked = null; }
    if (['approved','editorial'].includes(r.kind)) approved = r;
    if (r.version === doc.version && r.digest === digest) {
      latest = r;
      if (r.kind === 'self-check') { checked = r.result === 'passed' ? r : null; if (r.result === 'failed') approved = null; }
    }
  }
  if (approved?.version !== doc.version || approved?.digest !== digest) approved = null;
  return { approved, checked, latest };
}
export async function reviewStatus(directory, state) {
  if (state.reviewPolicy !== 1) return { compatibility: 'review-adoption-required', canProceed: false, pending: [], runs: [], documents: [], instruction: 'Preserve old results. Enable reviewPolicy: 1 with an empty reviewHistory after compatibility assessment; no historical approval is inferred.' };
  const map = await artifactMap(), documents = [], evidenceIssues = [], evidenceCache = new Map();
  for (const r of state.reviewHistory ?? []) {
    if (!evidenceCache.has(r.sourceRef)) { try { evidenceCache.set(r.sourceRef,await evidence(directory,state,r.sourceRef)); } catch { evidenceCache.set(r.sourceRef,null); } }
    if (!r.sourceDigest || evidenceCache.get(r.sourceRef) !== r.sourceDigest) evidenceIssues.push(r.id);
  }
  for (const doc of state.documents ?? []) {
    if (['source','change-log','review','handoff'].includes(doc.kind)) continue;
    let digest = null;
    try { digest = await reviewFingerprint(directory, state, doc); } catch { /* Missing input remains blocked. */ }
    const { approved, checked, latest } = decisionFor(state, doc, digest);
    documents.push({ path: doc.path, version: doc.version, digest, selfCheck: checked?.id ?? null, approval: approved?.id ?? null, status: !digest ? 'unavailable' : approved && (evidenceIssues.includes(approved.id) || (checked && evidenceIssues.includes(checked.id))) ? 'evidence-changed' : approved ? 'approved' : latest?.kind === 'changes-requested' ? 'changes-requested' : latest?.kind === 'self-check' && latest.result === 'failed' ? 'self-check-failed' : checked ? 'pending' : 'self-check-required' });
  }
  const runs = [], requirement = state.documentPolicy?.authority === 'adopted' ? 'scope' : 'prd';
  for (const [i, run] of state.stageRuns.entries()) {
    const spec = map.stages[run.stage];
    let required = [];
    if (spec?.humanReview) {
      const kind = spec.kind === 'requirement' ? requirement : spec.kind;
      required = (state.documents ?? []).filter(d => d.kind === kind || (run.stage === 'contract' && d.kind === 'sql')).map(d => d.path);
    }
    const declared = run.dependsOn ?? (i ? [state.stageRuns[i - 1].id] : []);
    const producers = state.stageRuns.slice(0, i).filter(r => r.outputRefs.some(out => run.inputRefs.some(input => out.split('#')[0] === input.split('#')[0]))).map(r => r.id);
    const development = ['requirements','scope','tech-design','contract','test-design','plan','implement'];
    const prerequisites = development.includes(run.stage) ? state.stageRuns.slice(0,i).filter(r=>development.includes(r.stage) && development.indexOf(r.stage)<development.indexOf(run.stage)).map(r=>r.id) : [];
    const dependsOn = [...new Set([...declared, ...producers, ...prerequisites])];
    const blockedBy = dependsOn.filter(id => !runs.find(r => r.id === id)?.ready);
    const waiting = required.filter(file => documents.find(d => d.path === file)?.status !== 'approved');
    const ready = run.progress === 'done' && !['needs-review','unknown'].includes(run.applicability) && !blockedBy.length && !waiting.length && (!spec?.humanReview || required.length > 0);
    runs.push({ id: run.id, stage: run.stage, progress: run.progress, applicability: run.applicability, documents: required, waiting, dependsOn, blockedBy, ready });
  }
  const current = runs.find(r => r.id === state.currentRun);
  const pending = runs.filter(r => r.progress !== 'planned').flatMap(r => r.waiting.map(document => ({ run: r.id, document, status: documents.find(d => d.path === document)?.status })));
  const nextRun = runs.find(r => !r.ready);
  const nextStage = current ? runs[runs.indexOf(current) + 1]?.stage ?? null : nextRun?.stage ?? null;
  return { compatibility: 'current', documents, runs, pending, evidenceIssues, currentRun: current?.id ?? null, nextRun: nextRun?.id ?? null, nextStage, canProceed: current ? !current.blockedBy.length && !(current.progress === 'done' && !current.ready) && current.progress !== 'blocked' && !['needs-review','unknown'].includes(current.applicability) : !pending.length && !runs.some(r=>r.progress==='blocked' || ['needs-review','unknown'].includes(r.applicability)), identity: 'Record validation only; user identity, intent and source authenticity are not authenticated.' };
}
async function evidence(directory, state, ref) {
  if (!text(ref) || ref.includes('\\') || ref.split('#')[0].split('/').includes('..') || ref.startsWith('/') || (/^[a-zA-Z]:/.test(ref) && !ref.startsWith('repo:'))) reject('Review evidence must stay inside a registered root.');
  let body;
  try { body = await safeRead(directory, state, ref); } catch { reject(`Cannot read review evidence ${ref}.`); }
  if (!text(body)) reject(`Preserve locally readable review evidence for ${ref}.`);
  const fragment = ref.split('#')[1];
  if (fragment && !anchors(body).includes(fragment)) reject(`Review evidence anchor not found: ${ref}.`);
  return hash(body);
}
export async function enforceReviews(directory, state, previous) {
  validateReviewState(state);
  if (state.reviewPolicy !== 1) reject('Adopt the review protocol before workflow updates; old results remain readable but are not approvals.');
  const oldHistory = previous?.reviewHistory ?? [];
  for (const old of previous?.documents ?? []) if (oldHistory.some(r=>r.document===old.path) && !state.documents.some(d=>d.path===old.path && d.kind===old.kind)) reject(`Preserve reviewed document registration ${old.path}.`);
  if (state.reviewHistory.length < oldHistory.length || !oldHistory.every((r, i) => isDeepStrictEqual(r, state.reviewHistory[i]))) reject('Preserve review history unchanged and in order.');
  const prefix = { ...state, reviewHistory: [...oldHistory] };
  for (const r of state.reviewHistory.slice(oldHistory.length)) {
    const doc = state.documents.find(d => d.path === r.document);
    if (!doc || r.version !== doc.version || r.digest !== await reviewFingerprint(directory, state, doc)) reject(`${r.id}: review must bind the current registered document version and content.`);
    const prior = decisionFor(prefix, doc, r.digest);
    if (r.kind === 'approved' && !prior.checked) reject(`${r.id}: self-check the same content before recording approval.`);
    if (r.kind === 'editorial' && (!prior.checked || !decisionFor(prefix, doc, r.previousDigest).approved)) reject(`${r.id}: editorial reconciliation needs a self-check and the previous approval at the same version.`);
    r.sourceDigest = await evidence(directory, state, r.sourceRef);
    prefix.reviewHistory.push(r);
  }
  // Only the initial selected development sequence is ordered; later rework can recur.
  const order = ['requirements','scope','tech-design','contract','test-design','plan','implement'];
  const first = stage => state.stageRuns.findIndex(r => r.stage === stage);
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
    const a = first(order[i]), b = first(order[j]);
    if (order[i] === 'requirements' && order[j] === 'scope') continue;
    if (a >= 0 && b >= 0 && a > b && !previous?.stageRuns.some(r => r.id === state.stageRuns[b].id && r.progress !== 'planned')) reject(`${order[i]} must precede ${order[j]} in the initial development arrangement.`);
  }
  const restoring = new Set(state.stageRuns.filter(r=>r.applicability === 'current' && previous?.stageRuns.some(old=>old.id===r.id && old.applicability==='needs-review')).map(r=>r.id));
  let status = await reviewStatus(directory, state);
  // Invalidate only registered producer/dependency paths. Independent branches retain their facts.
  const affected = new Set();
  for (const doc of state.documents) {
    const oldDoc = previous?.documents?.find(d => d.path === doc.path);
    const latest = oldHistory.filter(r => r.document === doc.path && ['approved','editorial'].includes(r.kind)).at(-1);
    const now = status.documents.find(d => d.path === doc.path);
    if (!oldDoc || !latest || !now) continue;
    const changed = latest.digest !== now.digest || latest.version !== doc.version;
    const editorial = state.reviewHistory.slice(oldHistory.length).some(r=>r.document===doc.path && r.kind==='editorial' && r.digest===now.digest);
    const requested = state.reviewHistory.slice(oldHistory.length).some(r=>r.document===doc.path && (r.kind==='changes-requested' || (r.kind==='self-check' && r.result==='failed')));
    if ((!changed && !requested) || editorial) continue;
    if (changed && !state.openChanges.some(c => c.status === 'open')) reject(`${doc.path}: record the material change and impact in an open CHG, or self-check an editorial reconciliation.`);
    if (changed && now.status === 'approved' && doc.version === latest.version) reject(`${doc.path}: a material revision needs a new document version; use editorial only for unchanged meaning.`);
    for (const r of status.runs.filter(r => r.documents.includes(doc.path) && r.progress !== 'planned')) affected.add(r.id);
  }
  for (const r of status.runs) if (r.dependsOn.some(id => affected.has(id))) affected.add(r.id);
  for (const r of state.stageRuns) if (affected.has(r.id) && r.progress !== 'planned') r.applicability = 'needs-review';
  status = await reviewStatus(directory, state);
  const previousStatus = previous?.reviewPolicy === 1 ? await reviewStatus(directory, previous) : null;
  for (const run of state.stageRuns) {
    const old = previous?.stageRuns.find(r => r.id === run.id);
    const progressing = ['active','done'].includes(run.progress) && (!old || old.progress !== run.progress || old.resultRef !== run.resultRef || restoring.has(run.id));
    if (restoring.has(run.id) && run.applicability === 'needs-review') reject(`${run.id}: current document or dependency still needs review.`);
    if (progressing && status.runs.find(r => r.id === run.id).blockedBy.length) reject(`${run.id}: prerequisite completion, approval or affected dependency is unresolved.`);
    if (old && old.progress !== 'planned' && previousStatus && !previousStatus.runs.find(r=>r.id===old.id).dependsOn.every(id=>status.runs.find(r=>r.id===run.id).dependsOn.includes(id))) reject(`${run.id}: preserve started dependencies; record revised work as a new run.`);
  }
  if (state.outcome.goal === 'met' && previous?.outcome.goal !== 'met' && status.runs.some(r => !r.ready)) reject('Resolve selected stages and document approvals before declaring the goal met.');
  return status;
}
