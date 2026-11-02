import { isDeepStrictEqual } from 'node:util';
import { artifactMap, safeRead, hasLocator, sections, definitions } from './documents.mjs';
import { fail, hash } from './io.mjs';
import {evaluateRuns} from './domains.mjs';

const text = value => typeof value === 'string' && value.trim().length > 0;
const reject = message => fail('REVIEW_CHECK', message, 'Read review status. Preserve history, self-check the current document, and record only an actual explicit user decision.');
const kinds = ['self-check', 'approved', 'changes-requested', 'editorial'];
export function validateReviewState(state) {
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
    const boundary=sections(body,(await artifactMap()).documents[doc.kind]).find(s=>s.id===stop);
    if(boundary?.count!==1) return null;
    const at=boundary.start;
    body = body.slice(0, at);
  }
  const assets = [];
  for (const ref of doc.assetRefs ?? []) { const bytes = await safeRead(directory,state,ref,null); if (bytes === null) return null; assets.push([ref,hash(bytes)]); }
  return hash(assets.length||doc.coverageRefs ? JSON.stringify([hash(body),assets,doc.coverageRefs??null]) : body);
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
    let inputBasis=false;
    if(doc.mode==='input') { try { await evidence(directory,state,doc.basisRef); inputBasis=true; } catch { /* The adoption request must be readable. */ } }
    const status=!digest ? 'unavailable' : (checked && evidenceIssues.includes(checked.id)) || (approved && evidenceIssues.includes(approved.id)) ? 'evidence-changed' : doc.mode==='input' && !inputBasis ? 'input-basis-required' : latest?.kind==='changes-requested' ? 'changes-requested' : latest?.kind==='self-check' && latest.result==='failed' ? 'self-check-failed' : doc.mode==='input' ? checked?'adopted':'self-check-required' : approved?'approved':checked?'pending':'self-check-required';
    documents.push({ path: doc.path, version: doc.version, digest, selfCheck: checked?.id ?? null, approval: doc.mode==='input'?null:approved?.id ?? null, input:doc.mode==='input', status });
  }
  let limitedScope=false;
  if(state.deliveryPolicy?.partialRef) {
    try { await evidence(directory,state,state.deliveryPolicy.partialRef); limitedScope=true; }
    catch { /* Report an unavailable scope basis; never silently grant an exception. */ }
  }
  let expectedCoverage=[];
  const testing=state.documents.find(d=>d.kind==='testing');
  if(testing){const body=await safeRead(directory,state,testing.path).catch(()=>null);expectedCoverage=testing.mode==='new'&&body?definitions(body,testing.path,map.documents.testing).filter(d=>d.id.startsWith('TC-')).map(d=>testing.path+'#'+d.id):(testing.coverageRefs??[]);}
  const execution=evaluateRuns(state,documents,map,{limitedScope,expectedCoverage,evidenceIssues});
  const runs=execution.runs;
  const current = runs.find(r => r.id === state.currentRun);
  const pending = runs.filter(r => r.progress !== 'planned').flatMap(r => r.waiting.map(document => ({ run: r.id, document, status: documents.find(d => d.path === document)?.status })));
  const nextRun = runs.find(r => !r.ready);
  const nextStage = current ? runs[runs.indexOf(current) + 1]?.stage ?? null : nextRun?.stage ?? null;
  return { compatibility: 'current', execution, documents, runs, pending, evidenceIssues, currentRun: current?.id ?? null, nextRun: nextRun?.id ?? null, nextStage, canProceed: !state.next.questionRef && (current ? !current.blockedBy.length && !(current.progress === 'done' && !current.releaseReady) && current.progress !== 'blocked' && !['needs-review','unknown'].includes(current.applicability) : !pending.length && !runs.some(r=>r.progress==='blocked' || (r.progress === 'done' && !r.releaseReady) || (r.progress !== 'planned' && r.blockedBy.length) || ['needs-review','unknown'].includes(r.applicability))), identity: 'Record validation only; user identity, intent and source authenticity are not authenticated.' };
}
async function evidence(directory, state, ref) {
  if (!text(ref) || ref.includes('\\') || ref.split('#')[0].split('/').includes('..') || ref.startsWith('/') || (/^[a-zA-Z]:/.test(ref) && !ref.startsWith('repo:'))) reject('Review evidence must stay inside a registered root.');
  let body;
  try { body = await safeRead(directory, state, ref); } catch { reject(`Cannot read review evidence ${ref}.`); }
  if (!text(body)) reject(`Preserve locally readable review evidence for ${ref}.`);
  const fragment = ref.split('#')[1];
  if (fragment && !hasLocator(body,fragment,(await artifactMap()).documents[state.documents?.find(d=>d.mode==='new' && d.path===ref.split('#')[0])?.kind])) reject(`Review evidence locator not found: ${ref}.`);
  return hash(body);
}
export async function enforceReviews(directory, state, previous) {
  validateReviewState(state);
  if (state.reviewPolicy !== 1) reject('Invalid review policy.');
  for(const doc of state.documents.filter(d=>d.mode==='input')) await evidence(directory,state,doc.basisRef);
  if(state.next.questionRef) await evidence(directory,state,state.next.questionRef);
  const oldHistory = previous?.reviewHistory ?? [];
  const previousPrd=previous?.documents.find(d=>d.kind==='prd'), currentPrd=state.documents.find(d=>d.kind==='prd');
  const replacedPrd=previousPrd && currentPrd && previousPrd.path!==currentPrd.path;
  for (const old of previous?.documents ?? []) {
    const retained=state.documents.some(d=>d.path===old.path && (d.kind===old.kind || (replacedPrd && old===previousPrd && d.kind==='source' && d.mode==='reused')));
    if(oldHistory.some(r=>r.document===old.path) && !retained)reject(`Preserve reviewed document registration ${old.path}.`);
  }
  const revisedApprovedPrd=replacedPrd && oldHistory.some(r=>r.document===previousPrd.path && (['approved','editorial'].includes(r.kind) || (previousPrd.mode==='input' && r.kind==='self-check' && r.result==='passed')));
  if(revisedApprovedPrd && !state.openChanges.some(c=>c.status==='open'))reject('Record the requirement authority change and impact in an open CHG.');
  if (state.reviewHistory.length < oldHistory.length || !oldHistory.every((r, i) => isDeepStrictEqual(r, state.reviewHistory[i]))) reject('Preserve review history unchanged and in order.');
  const prefix = { ...state, reviewHistory: [...oldHistory] };
  for (const r of state.reviewHistory.slice(oldHistory.length)) {
    const doc = state.documents.find(d => d.path === r.document);
    if (!doc || r.version !== doc.version || r.digest !== await reviewFingerprint(directory, state, doc)) reject(`${r.id}: review must bind the current registered document version and content.`);
    if(doc.mode==='input' && ['approved','editorial'].includes(r.kind)) reject('Supplied inputs use their adoption basis and self-check, not a fabricated document approval.');
    const prior = decisionFor(prefix, doc, r.digest);
    if (r.kind === 'approved' && !prior.checked) reject(`${r.id}: self-check the same content before recording approval.`);
    if (r.kind === 'editorial' && (!prior.checked || !decisionFor(prefix, doc, r.previousDigest).approved)) reject(`${r.id}: editorial reconciliation needs a self-check and the previous approval at the same version.`);
    r.sourceDigest = await evidence(directory, state, r.sourceRef);
    prefix.reviewHistory.push(r);
  }
  // Only the initial selected development sequence is ordered; later rework can recur.
  const order = ['requirements','tech-design','contract','test-design','plan','implement'];
  const first = stage => state.stageRuns.findIndex(r => r.stage === stage);
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
    const a = first(order[i]), b = first(order[j]);
    if (a >= 0 && b >= 0 && a > b && !previous?.stageRuns.some(r => r.id === state.stageRuns[b].id && r.progress !== 'planned')) reject(`${order[i]} must precede ${order[j]} in the initial development arrangement.`);
  }
  let status=await reviewStatus(directory,state);
  const addedChanges=state.openChanges.filter(c=>!previous?.openChanges.some(old=>JSON.stringify(old)===JSON.stringify(c)));
  const affected=new Set();
  for(const doc of state.documents){
    const priorDoc=previous?.documents.find(d=>d.path===doc.path),oldApproval=oldHistory.findLast(r=>r.document===doc.path&&(['approved','editorial'].includes(r.kind)||(priorDoc?.mode==='input'&&r.kind==='self-check'&&r.result==='passed')));
    const now=status.documents.find(d=>d.path===doc.path);if(!priorDoc||!oldApproval||!now)continue;
    const changed=oldApproval.digest!==now.digest||oldApproval.version!==doc.version;
    const previousContentChanged=previous.documentDigests?.[doc.path]!==state.documentDigests?.[doc.path]||priorDoc.version!==doc.version;
    const editorial=state.reviewHistory.slice(oldHistory.length).some(r=>r.document===doc.path&&r.kind==='editorial');
    if(!changed||editorial)continue;
    const change=(previousContentChanged?addedChanges:state.openChanges).find(c=>c.impactRef&&Array.isArray(c.affectedRefs));
    if(!change)reject(`${doc.path}: record the material change and scoped impact, or reconcile a true editorial change.`);
    if(['approved','adopted'].includes(now.status)&&doc.version===oldApproval.version)reject(`${doc.path}: material content needs a new version.`);
    if(!previousContentChanged)continue;
    for(const r of state.stageRuns){if(r.stage==='verify'){const refs=(r.coverageRefs??[]).filter(ref=>change.affectedRefs.includes(ref)||change.affectedRefs.includes(doc.path));r.invalidCoverageRefs=[...new Set([...(r.invalidCoverageRefs??[]),...refs])];}if(r.progress!=='planned'&&(r.outputRefs.includes(doc.path)&&!['implement','review','verify'].includes(r.stage)||change.affectedRefs.some(ref=>r.inputRefs.includes(ref)||r.outputRefs.includes(ref)||r.resultRef===ref||state.batches.some(b=>b.id===r.batchId&&(b.definitionRef===ref||b.taskRefs.includes(ref))))))affected.add(r.id);}
  }
  // A new authority or an explicit scoped impact need not edit the same file.
  for(const change of addedChanges){const old=previous?.openChanges.find(c=>c.id===change.id);if(!change.impactRef||!change.affectedRefs||old&&old.impactRef===change.impactRef&&JSON.stringify(old.affectedRefs)===JSON.stringify(change.affectedRefs))continue;
    for(const r of state.stageRuns){if(r.progress==='planned')continue;const refs=change.affectedRefs;if(r.stage==='verify'){const invalid=(r.coverageRefs??[]).filter(ref=>refs.includes(ref)||refs.includes(ref.split('#')[0]));r.invalidCoverageRefs=[...new Set([...(r.invalidCoverageRefs??[]),...invalid])];}
      if(refs.some(ref=>r.inputRefs.includes(ref)||r.outputRefs.includes(ref)||r.resultRef===ref||state.batches.some(b=>b.id===r.batchId&&(b.definitionRef===ref||b.taskRefs.includes(ref)))))affected.add(r.id);
    }
  }
  let changed=true;while(changed){const size=affected.size,affectedB=new Set(state.stageRuns.filter(r=>affected.has(r.id)&&r.batchId).map(r=>r.batchId));for(const b of state.batches)if(b.dependsOn.some(id=>affectedB.has(id)))for(const r of state.stageRuns.filter(r=>r.batchId===b.id&&r.progress!=='planned'))affected.add(r.id);for(const r of state.stageRuns)if([...(r.dependsOn??[]),...(r.reviewOf??[])].some(id=>affected.has(id)))affected.add(r.id);changed=affected.size!==size;}
  for(const r of state.stageRuns)if(affected.has(r.id))r.applicability='needs-review';
  status=await reviewStatus(directory,state);
  for(const r of state.stageRuns)if(r.applicability==='needs-review'&&!['implement','review','verify','handoff'].includes(r.stage)&&state.reviewHistory.slice(oldHistory.length).some(h=>r.outputRefs.includes(h.document)&&['approved','editorial','self-check'].includes(h.kind))&&r.outputRefs.length&&r.outputRefs.every(ref=>['approved','adopted'].includes(status.documents.find(d=>d.path===ref)?.status)))r.applicability='current';
  status=await reviewStatus(directory,state);
  for(const run of state.stageRuns){
    const old=previous?.stageRuns.find(r=>r.id===run.id);
    const progressing=['active','done'].includes(run.progress)&&(!old||old.progress!==run.progress||old.resultRef!==run.resultRef||old.applicability==='needs-review'&&run.applicability==='current');
    const recovering=old&&['needs-review','unknown'].includes(old.applicability)&&run.applicability==='current';
    const currentEntry=recovering?await reviewStatus(directory,{...state,stageRuns:state.stageRuns.map(r=>r.id===run.id?{...r,approvalBasis:undefined}:r)}):status;
    if((progressing||recovering)&&currentEntry.runs.find(r=>r.id===run.id).blockedBy.length)reject(`${run.id}: prerequisite completion, approval or affected work is unresolved.`);
    const rs=status.runs.find(r=>r.id===run.id);
    if(run.progress==='done'&&rs.ready&&!run.approvalBasis?.length){
      const relevant=status.documents.filter(d=>['approved','adopted'].includes(d.status));
      run.approvalBasis=relevant.map(d=>{const event=state.reviewHistory.findLast(h=>h.document===d.path&&h.digest===d.digest&&['approved','editorial','self-check'].includes(h.kind));return {document:d.path,digest:d.digest,recordId:event.id};});
    }
  }
  if (state.outcome.goal === 'met' && previous?.outcome.goal !== 'met' && status.runs.some(r => !r.ready&&!r.resolvedBy&&r.stage!=='verify')) reject('Resolve selected stages and document approvals before declaring the goal met.');
  return status;
}
