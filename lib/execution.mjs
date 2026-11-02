// Advisory work classification. Every implementation still participates in review gates.
export function implementationType(state,run){return run.stage==='implement'?(run.workType??'unclassified'):null;}
export function implementationSummary(state) {
  const runs=state.stageRuns.filter(r=>r.stage==='implement');
  return Object.fromEntries(['batch','repair','unclassified'].map(kind=>[kind,runs.filter(r=>implementationType(state,r)===kind)]));
}
export function resolvedRun(state,review,run){return review.runs.find(r=>r.id===run.id)?.resolvedBy??null;}
export function implementationReviewScope(state,run) {
  if(implementationType(state,run)==='batch')return 'batch';
  if(implementationType(state,run)==='repair') {
    const basis=(run.repairOf??[]).map(id=>state.stageRuns.find(r=>r.id===id));
    if(basis.some(r=>r?.stage==='review' && r.reviewScope==='overall'))return 'overall-recheck';
    if(run.batchId)return 'recheck';
    if(basis.length && basis.every(r=>r?.stage==='review' && r.reviewOf?.length))return 'recheck';
  }
  return null;
}
