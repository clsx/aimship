import path from 'node:path';
import { unknownConditions } from './documents.mjs';
import { fail } from './io.mjs';

// Additive policy: absent means historical, never inferred complete or rewritten on read.
export function validateDelivery(state) {
  const p = state.deliveryPolicy;
  if (p === undefined) return;
  if (!p || p.version !== 1) fail('INVALID_STATE', 'Unsupported delivery policy.', 'Preserve the state and use a compatible tool.');
  if (p.partialRef != null && (typeof p.partialRef !== 'string' || !p.partialRef.trim())) fail('INVALID_STATE', 'partialRef must identify the explicit scope decision.', 'Record the actual decision in the existing requirement or change record.');
  for (const r of state.stageRuns) {
    if (r.overall !== undefined && (r.stage !== 'review' || typeof r.overall !== 'boolean')) fail('INVALID_STATE', 'overall is a review scope flag.', 'Identify the actual overall review.');
    if (r.sessionGroup !== undefined && (typeof r.sessionGroup !== 'string' || !r.sessionGroup.trim())) fail('INVALID_STATE', 'Invalid sessionGroup.', 'Use a nonempty advisory group ID.');
    if (r.reviewOf !== undefined && (r.stage !== 'review' || !Array.isArray(r.reviewOf) || !r.reviewOf.length || new Set(r.reviewOf).size !== r.reviewOf.length || r.reviewOf.some(id => !state.stageRuns.some(x => x.id === id && x.stage === 'implement')))) fail('INVALID_STATE', 'reviewOf must identify implementation runs.', 'Record the actual reviewed batches.');
  }
}
export function arrangeSessions(state) {
  if (state.deliveryPolicy?.version !== 1) return;
  for (const r of state.stageRuns) {
    if (r.sessionGroup) continue;
    const category = ['frame','requirements','scope'].includes(r.stage) ? 'requirements' : ['tech-design','contract','prototype'].includes(r.stage) ? 'technical' : r.stage;
    const batch = r.stage === 'review' && !r.overall && r.reviewOf?.length === 1 ? state.stageRuns.find(x=>x.id===r.reviewOf[0]) : null;
    r.sessionGroup = batch ? (batch.sessionGroup ?? `implement:${batch.id}`) : ['requirements','technical','test-design','plan'].includes(category) ? category : `${category}:${r.id}`;
  }
}
export function completionStatus(state, review, {changed=[]}={}) {
  if (state.deliveryPolicy?.version !== 1) return {status:'historical-unassessed', standardComplete:false, readyForAcceptance:false, gaps:['Historical outcomes are preserved; explicitly adopt the delivery policy after assessing evidence.']};
  const runs=state.stageRuns, gaps=[];
  if (state.schemaVersion === 3 && (state.goal.endpoint === null || state.documentPolicy.authority === null || unknownConditions(state.documentPolicy).length)) gaps.push('Endpoint or artifact conditions remain unknown.');
  if(changed.length) gaps.push('Changed or missing registered documents require reconciliation.');
  const ready=r=>review.runs.find(x=>x.id===r.id)?.ready;
  const has=stage=>runs.some(r=>r.stage===stage && ready(r));
  for (const stage of ['tech-design','test-design','plan','implement','verify','handoff']) if (!has(stage)) gaps.push(`Missing current completed ${stage}.`);
  if (!runs.some(r=>['requirements','scope'].includes(r.stage) && ready(r))) gaps.push('Missing reviewed requirements / Scope.');
  if ((state.documentPolicy?.interface!=='none' || state.documentPolicy?.databases?.length) && !has('contract')) gaps.push('Missing applicable interface/SQL contract.');
  if (state.documentPolicy?.interaction && !state.documentPolicy.prototypeCovered && !has('prototype')) gaps.push('Missing applicable interaction prototype.');
  if (review.runs.some(r=>!r.ready)) gaps.push('Selected work or document approvals remain unresolved.');
  const implementations=runs.filter(r=>r.stage==='implement');
  if (implementations.some(r=>['failed','mixed','unknown','not-run'].includes(r.result))) gaps.push('Implementation results remain unresolved.');
  const allReviews=runs.filter(r=>r.stage==='review');
  const effectiveReviews=allReviews.filter((r,i)=>!allReviews.slice(i+1).some(later=>ready(later) && later.result==='passed' && later.historyResultRefs?.includes(r.resultRef)));
  if (effectiveReviews.some(r=>!ready(r) || r.result!=='passed')) gaps.push('Review results remain unresolved.');
  const reviews=allReviews.filter(r=>ready(r) && r.result==='passed');
  for (const [i, batch] of implementations.entries()) {
    if (!reviews.some(r=>r.reviewOf?.includes(batch.id) && runs.indexOf(r)>runs.indexOf(batch) && (!implementations[i+1] || runs.indexOf(r)<runs.indexOf(implementations[i+1])))) gaps.push(`Missing passing batch review for ${batch.id}.`);
  }
  const overall=reviews.findLast(r=>r.overall === true && implementations.length && implementations.every(b=>r.reviewOf?.includes(b.id) && runs.indexOf(r)>runs.indexOf(b)));
  if (!overall) gaps.push('Missing passing overall implementation review.');
  const allChecks=runs.filter(r=>r.stage==='verify');
  const checks=allChecks.filter((r,i)=>!allChecks.slice(i+1).some(later=>ready(later) && later.result==='passed' && later.historyResultRefs?.includes(r.resultRef)));
  if (!checks.length || checks.some(r=>!ready(r) || r.result!=='passed' || !overall || runs.indexOf(r)<runs.indexOf(overall))) gaps.push('Independent verification is not fully recorded as passed after overall review.');
  const handoff=runs.findLast(r=>r.stage==='handoff' && ready(r));
  if (handoff && checks.some(r=>runs.indexOf(r)>runs.indexOf(handoff))) gaps.push('Handoff precedes verification.');
  if (state.openChanges.some(c=>c.status==='open')) gaps.push('Unresolved changes remain.');
  const partial=!!state.deliveryPolicy.partialRef;
  const readyForAcceptance=!partial && !gaps.length;
  return {status:partial?'partial-scope':readyForAcceptance && state.outcome.goal==='met' && state.outcome.acceptance==='accepted'?'standard-complete':readyForAcceptance?'ready-for-acceptance':'incomplete',standardComplete:readyForAcceptance && state.outcome.goal==='met' && state.outcome.acceptance==='accepted',readyForAcceptance,gaps,partialRef:state.deliveryPolicy.partialRef??null,scope:'Recorded structure, approvals and results only; not independent proof of test execution or semantic quality.'};
}
export function sessionAdvice(directory,state,review,{saved=true}={}) {
  const groups=[];
  for (const r of state.stageRuns) {
    const id=r.sessionGroup??'unrecorded';let g=groups.find(x=>x.id===id);if(!g)groups.push(g={id,runs:[]});g.runs.push(r.id);
  }
  const current=state.stageRuns.find(r=>r.id===state.currentRun);
  const status=review.runs.find(r=>r.id===state.currentRun);
  const pending=review.pending.some(p=>state.stageRuns.find(r=>r.id===p.run)?.progress==='done' || p.status==='changes-requested' || p.status==='self-check-failed');
  const next=current?state.stageRuns[state.stageRuns.indexOf(current)+1]:state.stageRuns.find(r=>r.progress!=='done');
  let action='continue-current';
  if (!saved) action='reconcile-save';
  else if(state.deliveryPolicy?.version !== 1) action='assess-compatibility';
  else if(pending) action='await-review';
  else if(!current && state.stageRuns.length && review.runs.every(r=>r.ready)) action='finished';
  else if(current && (['failed','mixed','unknown','not-run'].includes(current.result) || current.progress==='blocked' || ['needs-review','unknown'].includes(current.applicability))) action='resolve-current';
  else if(status?.ready) action=!next?'finished':next.progress!=='planned'?'inspect-existing-work':current.sessionGroup && current.sessionGroup===next.sessionGroup?'continue-group':'suggest-new-session';
  if (saved && !pending && state.deliveryPolicy?.version === 1 && status?.ready && next && review.runs.find(r=>r.id===next.id)?.blockedBy.length) action='resolve-current';
  const continuation=['assess-compatibility','reconcile-save','await-review','finished'].includes(action)?null:`Use Aimship to continue delivery ${JSON.stringify(path.resolve(directory))}; first read its current state and relevant formal documents, then continue the recorded work.`;
  return {action,currentRun:current?.id??null,nextRun:next?.id??null,groups,continuation,advisory:true,note:'A session boundary is not a blocker or approval. Continue here when requested. Resolve the delivery identity, current approvals and unfinished effects on every resume; this text grants no approval.'};
}
