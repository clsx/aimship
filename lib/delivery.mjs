import { text, completionMessage } from './language.mjs';
import path from 'node:path';
import { unknownConditions } from './documents.mjs';
import { fail } from './io.mjs';

// Current delivery policy and completion checks.
export function validateDelivery(state) {
  const p = state.deliveryPolicy;
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
    const category = ['frame','requirements'].includes(r.stage) ? 'requirements' : ['tech-design','contract','prototype'].includes(r.stage) ? 'technical' : r.stage;
    const batch = r.stage === 'review' && !r.overall && r.reviewOf?.length === 1 ? state.stageRuns.find(x=>x.id===r.reviewOf[0]) : null;
    r.sessionGroup = batch ? (batch.sessionGroup ?? `implement:${batch.id}`) : ['requirements','technical','test-design','plan'].includes(category) ? category : `${category}:${r.id}`;
  }
}
export function completionStatus(state, review, {changed=[]}={}) {
  const runs=state.stageRuns, gaps=[];
  if (state.goal.endpoint === null) gaps.push('Delivery endpoint remains unknown.');
  if (state.documentPolicy.authority === null || unknownConditions(state.documentPolicy).length) gaps.push('Artifact conditions remain unknown.');
  if(changed.length) gaps.push('Changed or missing registered documents require reconciliation.');
  const ready=r=>review.runs.find(x=>x.id===r.id)?.ready;
  const has=stage=>runs.some(r=>r.stage===stage && ready(r));
  for (const stage of ['tech-design','test-design','plan','implement','verify','handoff']) if (!has(stage)) gaps.push(`Missing current completed ${stage}.`);
  if (!runs.some(r=>r.stage==='requirements' && ready(r))) gaps.push('Missing reviewed requirements.');
  if (((state.documentPolicy?.interface!=null && state.documentPolicy.interface!=='none') || state.documentPolicy?.databases?.length) && !has('contract')) gaps.push('Missing applicable interface/SQL contract.');
  if (runs.some(r=>r.stage==='prototype') && !has('prototype')) gaps.push('Missing applicable interaction prototype.');
  if (review.runs.some(r=>!r.ready)) gaps.push('Selected work or document approvals remain unresolved.');
  const implementations=runs.filter(r=>r.stage==='implement');
  if (implementations.some(r=>['failed','mixed','unknown','not-run'].includes(r.result))) gaps.push('Implementation results remain unresolved.');
  const allReviews=runs.filter(r=>r.stage==='review');
  const effectiveReviews=allReviews.filter(r=>!review.runs.find(x=>x.id===r.id)?.resolvedBy);
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
  return {status:partial?'partial-scope':readyForAcceptance && state.outcome.goal==='met' && state.outcome.acceptance==='accepted'?'standard-complete':readyForAcceptance?'ready-for-acceptance':'incomplete',standardComplete:readyForAcceptance && state.outcome.goal==='met' && state.outcome.acceptance==='accepted',readyForAcceptance,gaps:gaps.map(g=>completionMessage(state,g)),partialRef:state.deliveryPolicy.partialRef??null,scope:text(state,'Recorded structure, approvals and results only; not independent proof of test execution or semantic quality.','仅评估已记录的结构、审批和结果；不独立证明测试已执行或内容语义正确。')};
}
// A display suggestion, never a scheduled run or authorization.
export function suggestedNextStage(state) {
  const current=state.stageRuns.find(r=>r.id===state.currentRun) ?? state.stageRuns.at(-1);
  const scheduled=current?state.stageRuns[state.stageRuns.indexOf(current)+1]:state.stageRuns[0];
  if(scheduled)return scheduled.stage;
  if(state.deliveryPolicy.partialRef)return null;
  if(!current)return 'requirements';
  const contracts=(state.documentPolicy.interface!=null && state.documentPolicy.interface!=='none') || state.documentPolicy.databases?.length;
  return ({frame:'requirements',requirements:'tech-design',prototype:'tech-design','tech-design':contracts?'contract':'test-design',contract:'test-design','test-design':'plan',plan:'implement',implement:'review',review:current.overall?'verify':'review',verify:'handoff'})[current.stage]??null;
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
  const concluded=state.outcome.goal==='met' && review.runs.every(r=>r.ready)
    && (!!state.deliveryPolicy?.partialRef || completionStatus(state,review).readyForAcceptance);
  const last=state.stageRuns.at(-1);
  const endAction=concluded?'finished':(current??last)?.stage==='handoff'?'assess-outcome':'await-continue';
  let action='continue-current';
  if (!saved) action='reconcile-save';
  else if(state.next.questionRef) action='await-clarification';
  else if(pending) action=review.pending.some(p=>!review.documents.find(d=>d.path===p.document)?.input)?'await-review':'resolve-current';
  else if(!current && state.stageRuns.length && review.runs.every(r=>r.ready)) action=concluded?endAction:review.runs.some(r=>r.releaseReady===false)?'resolve-current':endAction;
  else if(current && ((!status?.resolvedBy && (['failed','mixed','unknown','not-run'].includes(current.result) || (current.stage==='review' && current.progress==='done' && !status?.releaseReady))) || current.progress==='blocked' || ['needs-review','unknown'].includes(current.applicability))) action=concluded && !next?'finished':'resolve-current';
  else if(status?.ready) action=!next?endAction:next.progress!=='planned'?'inspect-existing-work':'await-continue';
  if (saved && !pending && state.deliveryPolicy?.version === 1 && status?.ready && next && review.runs.find(r=>r.id===next.id)?.blockedBy.length) action='resolve-current';
  const instruction=action==='await-clarification'?text(state,'Please answer the question listed below so this work can continue.','请回答下一步所列的具体问题，以便继续当前工作。'):action==='await-continue'?text(state,'This stage is saved. Say “continue” when ready; you can continue here or start a new session.','本阶段已保存。准备好后可说“继续”；也可以新开会话接续。'):action==='assess-outcome'?text(state,'Review the handoff against the agreed goal and record the actual goal conclusion and acceptance; completed handoff alone does not end the delivery.','请对照约定目标审阅交付材料，记录实际目标结论和用户接受结果；完成交付文档不等于交付已结束。'):null;
  const continuation=['reconcile-save','await-review','await-clarification','assess-outcome','finished'].includes(action)?null:text(state,`Use Aimship to continue delivery ${JSON.stringify(path.resolve(directory))}; first read its current state and relevant formal documents, then continue the recorded work.${instruction?' '+instruction:''}`,`使用 Aimship 继续交付「${path.resolve(directory)}」，先读取当前状态和相关正式文档再接续。${instruction??''}`);
  return {action,stop:!['continue-current','inspect-existing-work'].includes(action),suggestNewSession:['await-review','await-continue'].includes(action),currentRun:current?.id??null,nextRun:next?.id??null,groups,continuation,instruction,advisory:true,note:text(state,'A session boundary is not a blocker or approval. Continue here when requested. Resolve the delivery identity, current approvals and unfinished effects on every resume; this text grants no approval.','会话边界不是阻塞或批准。用户要求时可在当前会话继续。每次续接都需核对交付身份、当前审批和未完成事项；本提示不授予权限。')};
}
