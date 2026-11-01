// Advisory work classification. Every implementation still participates in review gates.
export function implementationType(state, run) {
  if (run.stage !== 'implement') return null;
  if (run.workType) return run.workType;
  const before = state.stageRuns.slice(0,state.stageRuns.indexOf(run));
  const lastReview=before.findLast(r=>r.stage==='review');
  return before.some(r=>r.stage==='review' && r.overall || ['verify','handoff'].includes(r.stage)) || lastReview && lastReview.result!=='passed' ? 'unclassified' : 'batch';
}
export function implementationSummary(state) {
  const runs=state.stageRuns.filter(r=>r.stage==='implement');
  return Object.fromEntries(['batch','repair','unclassified'].map(kind=>[kind,runs.filter(r=>implementationType(state,r)===kind)]));
}
export function resolvedRun(state, review, run) {
  const recorded=review.runs.find(r=>r.id===run.id)?.resolvedBy;
  if (recorded) return recorded;
  if(run.stage!=='verify' || !run.resultRef) return null;
  return state.stageRuns.slice(state.stageRuns.indexOf(run)+1).findLast(r=>r.stage==='verify' && r.result==='passed' && review.runs.find(s=>s.id===r.id)?.ready && r.historyResultRefs?.includes(run.resultRef))?.id ?? null;
}
export function implementationReviewScope(state,run) {
  if(implementationType(state,run)==='batch')return 'batch';
  if(implementationType(state,run)==='repair') {
    const basis=(run.repairOf??[]).map(id=>state.stageRuns.find(r=>r.id===id));
    if(basis.some(r=>r?.stage==='review' && r.overall===true))return 'overall-recheck';
    if(basis.length && basis.every(r=>r?.stage==='review' && r.reviewOf?.length))return 'recheck';
  }
  return null;
}
