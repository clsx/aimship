// Delivery domains share facts and dependencies; they do not share one status enum.
import {fail} from './io.mjs';
const present=x=>typeof x==='string'&&x.trim().length>0;
const ok=r=>r?.progress==='done'&&!['needs-review','unknown'].includes(r.applicability);
const passing=r=>ok(r)&&r.result==='passed';
const development=['requirements','tech-design','contract','test-design','plan','implement'];
const execution=['implement','review','verify','handoff'];
const reject=message=>fail('INVALID_STATE',message,'Read the current domain facts and record the actual relationship.');
export const phaseOf=run=>run.stage==='review'&&run.reviewScope==='batch'?'implement':run.stage;
export function phaseOrder(state){
 const selected=[...new Set(state.stageRuns.map(phaseOf))];if(state.deliveryPolicy.partialRef)return selected;
 const order=['requirements','tech-design','contract','test-design','plan','implement','review','verify','handoff'];
 if(state.documentPolicy.interface==='none'&&state.documentPolicy.databases?.length===0&&!selected.includes('contract'))order.splice(2,1);
 for(const stage of selected.filter(s=>!order.includes(s))){const at=state.stageRuns.findIndex(r=>phaseOf(r)===stage),next=state.stageRuns.slice(at+1).map(phaseOf).find(s=>order.includes(s)),prior=state.stageRuns.slice(0,at).map(phaseOf).findLast(s=>order.includes(s));order.splice(next?order.indexOf(next):prior?order.indexOf(prior)+1:0,0,stage);}return order;
}
export function validateDomains(state){
 if(!Array.isArray(state.batches))reject('batches must be an array.');
 const ids=new Set();for(const b of state.batches){if(!/^B-\d{3,}$/.test(b.id)||ids.has(b.id)||!present(b.definitionRef)||!Array.isArray(b.taskRefs)||!Array.isArray(b.dependsOn))reject('Each batch needs a unique B id, definitionRef, taskRefs and dependsOn.');ids.add(b.id);}
 const visiting=new Set(),visited=new Set();const visit=id=>{if(visiting.has(id))reject('Batch dependencies must not contain a cycle.');if(visited.has(id))return;visiting.add(id);const b=state.batches.find(x=>x.id===id);for(const dep of b.dependsOn){if(!ids.has(dep))reject('Unknown batch dependency '+dep);visit(dep);}visiting.delete(id);visited.add(id);};ids.forEach(visit);
 for(const [i,r] of state.stageRuns.entries()){
  if(r.reviewScope!==undefined&&(r.stage!=='review'||!['batch','overall'].includes(r.reviewScope)))reject('reviewScope belongs to reviews.');
  if(r.overall!==undefined)reject('Use reviewScope, not the former overall flag.');
  if(r.batchId!==undefined&&!ids.has(r.batchId))reject('Unknown batchId on '+r.id);
  if(r.stage==='implement'&&r.progress!=='planned'){
   if(!['batch','repair'].includes(r.workType))reject('Implementation needs its actual workType.');
   if(r.workType==='batch'&&!r.batchId)reject('Business implementation needs batchId.');
  }
  if(r.stage==='review'&&r.progress!=='planned'){
   if(!['batch','overall'].includes(r.reviewScope))reject('Review needs explicit batch/overall scope.');
   if(r.reviewScope==='batch'&&!r.batchId)reject('Batch review needs batchId.');
   if((!state.deliveryPolicy.partialRef&&!r.reviewOf?.length)||(r.reviewOf??[]).some(id=>!state.stageRuns.slice(0,i).some(p=>p.id===id&&p.stage==='implement')))reject('Review must cover preceding implementation records.');
  }
  if(r.progress==='done'&&['implement','review','verify'].includes(r.stage)&&!/^[a-f0-9]{64}$/.test(r.objectKey??''))reject('Completed engineering records need their actual objectKey digest.');
  if(r.stage==='verify'&&r.progress!=='planned'&&(!r.coverageRefs?.length||!r.coverageRefs.every(present)))reject('Formal execution needs coverageRefs.');
  if(Array.isArray(r.coverageResults)&&r.coverageResults.some(x=>r.result==='passed'&&x.result!=='passed'||r.result==='failed'&&x.result==='passed'))reject('Run and coverage results conflict; record mixed results explicitly.');
  if(r.coverageResults!==undefined&&(!Array.isArray(r.coverageResults)||r.coverageResults.some(x=>!r.coverageRefs?.includes(x.ref)||!['passed','failed','mixed','unknown','not-run'].includes(x.result))||new Set(r.coverageResults.map(x=>x.ref)).size!==r.coverageResults.length))reject('coverageResults must identify distinct declared coverage and actual results.');
  if(r.invalidCoverageRefs!==undefined&&(!Array.isArray(r.invalidCoverageRefs)||r.invalidCoverageRefs.some(ref=>!r.coverageRefs?.includes(ref))))reject('Invalid coverage applicability.');
  if(r.assessment?.coverageRefs&&(!Array.isArray(r.assessment.coverageRefs)||r.assessment.coverageRefs.some(ref=>!r.coverageRefs?.includes(ref))))reject('Assessment coverage must belong to its RUN.');
  if(r.assessment&&(!/^[a-f0-9]{64}$/.test(r.assessment.forObjectKey??'')||!present(r.assessment.ref)))reject('An applicability assessment needs its target object and evidence ref.');
 }
}
export function coversReview(later,earlier){return later.stage==='review'&&earlier.stage==='review'&&later.historyResultRefs?.includes(earlier.resultRef)&&later.reviewScope===earlier.reviewScope&&(later.reviewScope==='overall'||later.batchId===earlier.batchId)&&((earlier.reviewOf?.length)?earlier.reviewOf.every(id=>later.reviewOf?.includes(id)):later.objectKey===earlier.objectKey&&later.scope===earlier.scope);}
function resolvesImplementation(later,earlier){return later.stage==='implement'&&earlier.stage==='implement'&&later.workType==='repair'&&later.batchId===earlier.batchId&&later.historyResultRefs?.includes(earlier.resultRef);}
const matchObject=(run,key,ref)=>!!key&&(run.objectKey===key||(run.assessment?.forObjectKey===key&&(!ref||!run.assessment.coverageRefs||run.assessment.coverageRefs.includes(ref))));
export function batchStates(state,statuses){
 const ready=id=>statuses.find(s=>s.id===id)?.releaseReady;
 return state.batches.map(b=>{
  const work=state.stageRuns.filter(r=>r.stage==='implement'&&r.batchId===b.id&&r.progress!=='planned');
  const reviews=state.stageRuns.filter(r=>r.stage==='review'&&r.reviewScope==='batch'&&r.batchId===b.id&&r.progress!=='planned');
  const review=reviews.findLast(r=>passing(r)&&ready(r.id)&&work.length&&work.every(w=>r.reviewOf?.includes(w.id)&&state.stageRuns.indexOf(r)>state.stageRuns.indexOf(w)));
  const unresolved=reviews.some(r=>!statuses.find(s=>s.id===r.id)?.resolvedBy&&(!ready(r.id)||r.result!=='passed'));
  const implReady=work.length>0&&work.every(r=>ready(r.id));
  const status=work.some(r=>['needs-review','unknown'].includes(r.applicability))?'needs-review':work.some(r=>r.progress==='blocked')?'blocked':review&&!unresolved&&implReady?'complete':unresolved?'needs-repair':implReady?'await-review':work.length?'active':'planned';
  return {...b,status,implementationIds:work.map(r=>r.id),reviewIds:reviews.map(r=>r.id),reviewId:review?.id??null};
 });
}
export function overallReview(state,statuses){
 const work=state.stageRuns.filter(r=>r.stage==='implement'&&r.progress!=='planned');
 if(state.stageRuns.some(r=>r.stage==='review'&&r.progress!=='planned'&&!statuses.find(s=>s.id===r.id)?.resolvedBy&&(!statuses.find(s=>s.id===r.id)?.releaseReady||r.result!=='passed')))return null;
 return state.stageRuns.findLast(r=>r.stage==='review'&&r.reviewScope==='overall'&&passing(r)&&statuses.find(s=>s.id===r.id)?.releaseReady&&work.length&&work.every(w=>r.reviewOf?.includes(w.id)&&state.stageRuns.indexOf(r)>state.stageRuns.indexOf(w)))??null;
}
export function verificationState(state,statuses,expected=[]){
 const overall=overallReview(state,statuses),target=overall?.objectKey;
 const all=state.stageRuns.filter(r=>r.stage==='verify'&&r.progress!=='planned');
 const units=new Map();for(const r of all){for(const ref of (r.coverageRefs??[]).filter(ref=>expected.includes(ref))){let list=units.get(ref);if(!list)units.set(ref,list=[]);list.push(r);}}
 for(const ref of expected)if(!units.has(ref))units.set(ref,[]);
 const coverage=[...units].map(([ref,records])=>{
  let effective=null;const pending=new Map();
  for(const r of records){
   const result=r.coverageResults?.find(x=>x.ref===ref)?.result??r.result??'unknown';
   if(result!=='passed')pending.set(r.resultRef,{run:r,result});
   if(!ok(r)||r.invalidCoverageRefs?.includes(ref)||!expected.includes(ref)||!statuses.find(s=>s.id===r.id)?.ready||!matchObject(r,target,ref))continue;
   if(result==='passed')for(const old of r.historyResultRefs??[])pending.delete(old);
   effective={run:r,result};
  }
  if(pending.size)effective=[...pending.values()].at(-1);
  if(effective?.result==='passed'&&(effective.run.invalidCoverageRefs?.includes(ref)||!ok(effective.run)||!matchObject(effective.run,target,ref)))effective=null;
  return {ref,runId:effective?.run.id??null,resultRef:effective?.run.resultRef??null,result:effective?.result??'not-run'};
 });
 return {overallId:overall?.id??null,objectKey:target??null,coverage,passed:!!overall&&coverage.length>0&&coverage.every(c=>c.result==='passed'),runIds:[...new Set(coverage.map(c=>c.runId).filter(Boolean))]};
}
export function evaluateRuns(state,documents,map,{limitedScope=false,expectedCoverage=[],evidenceIssues=[]}={}){
 const statuses=[];
 const approved=kind=>{const docs=state.documents.filter(d=>d.kind===kind);return docs.length>0&&docs.every(d=>['approved','adopted'].includes(documents.find(x=>x.path===d.path)?.status));};
 for(const [i,run] of state.stageRuns.entries()){
  const before=state.stageRuns.slice(0,i),spec=map.stages[run.stage];
  const historical=(!spec?.humanReview||state.documents.filter(d=>run.outputRefs.includes(d.path)&&d.kind===(spec.kind==='requirement'?'prd':spec.kind)).every(d=>['approved','adopted'].includes(documents.find(x=>x.path===d.path)?.status)))&&run.progress==='done'&&run.approvalBasis?.length&&run.approvalBasis.every(b=>state.reviewHistory.some(h=>h.id===b.recordId&&h.document===b.document&&h.digest===b.digest&&(['approved','editorial'].includes(h.kind)||(h.kind==='self-check'&&h.result==='passed'&&(state.documents.find(d=>d.path===h.document)?.mode==='input'||state.goalHistory?.some(g=>g.goalRef?.split('#')[0]===h.document))))&&!evidenceIssues.includes(h.id)));
  const required=spec?.humanReview?state.documents.filter(d=>d.kind===(spec.kind==='requirement'?'prd':spec.kind)||(run.stage==='contract'&&d.kind==='sql')).map(d=>d.path):[];
  const waiting=historical?[]:required.filter(p=>!['approved','adopted'].includes(documents.find(d=>d.path===p)?.status));
  const designOrder=['requirements','prototype','tech-design','contract','test-design','plan'],rank=designOrder.indexOf(run.stage),predecessor=rank>0?before.findLast(r=>designOrder.indexOf(r.stage)>=0&&designOrder.indexOf(r.stage)<rank):null;
  const deps=run.dependsOn??(predecessor?[predecessor.id]:[]),blocked=[];
  for(const id of deps){const prior=before.find(r=>r.id===id),s=statuses.find(s=>s.id===id);if(!historical&&!s?.releaseReady&&!coversReview(run,prior??{})&&!resolvesImplementation(run,prior??{}))blocked.push(id);}
  const needs=[];if(!historical){if(['prototype','tech-design','contract','test-design','plan','implement'].includes(run.stage))needs.push('prd');if(['contract','test-design','plan','implement'].includes(run.stage))needs.push('tech-design');if(['plan','implement'].includes(run.stage)&&!limitedScope)needs.push('testing');if(run.stage==='implement')needs.push('plan');if(run.stage==='verify'&&!limitedScope)needs.push('testing');if(run.stage==='review'&&!limitedScope)needs.push('prd','tech-design','plan');const prototype=before.findLast(r=>r.stage==='prototype')??state.stageRuns.find(r=>r.stage==='prototype'&&run.dependsOn?.includes(r.id));if(['tech-design','contract','test-design','plan','implement'].includes(run.stage)&&prototype){needs.push('prototype');if(!statuses.find(s=>s.id===prototype.id)?.releaseReady)blocked.push('entry:selected-prototype');}if(['test-design','plan','implement'].includes(run.stage)){if(state.documentPolicy.interface!==null&&state.documentPolicy.interface!=='none')needs.push('contract');if(state.documentPolicy.databases?.length)needs.push('sql');}for(const kind of needs)if(!approved(kind))blocked.push('approval:'+kind);}
  if(!limitedScope){
   const subset={...state,stageRuns:before};const batches=batchStates(subset,statuses);
   if(run.stage==='implement'){
    const plan=before.findLast(r=>r.stage==='plan')??state.stageRuns.find(r=>r.stage==='plan');if(!historical&&plan&&!statuses.find(s=>s.id===plan.id)?.releaseReady)blocked.push('entry:selected-plan');
    const b=state.batches.find(b=>b.id===run.batchId);if(b)for(const id of b.dependsOn)if(batches.find(b=>b.id===id)?.status!=='complete')blocked.push('batch:'+id);
    if(run.workType==='repair'&&!run.batchId&&!run.repairOf?.length)blocked.push('repair:scope');
   }
   if(run.stage==='review'){
    const work=before.filter(r=>r.stage==='implement'&&r.progress!=='planned'&&(run.reviewScope==='overall'||r.batchId===run.batchId));
    if(!work.length||work.some(r=>!run.reviewOf?.includes(r.id)))blocked.push('entry:implementation-coverage');
    for(const id of run.reviewOf??[])if(!statuses.find(s=>s.id===id)?.releaseReady)blocked.push('implementation:'+id);
    if(run.reviewScope==='overall'&&batches.some(b=>b.status!=='complete'))blocked.push('entry:batch-reviews');
    if(run.reviewScope==='batch'&&(run.reviewOf??[]).some(id=>before.find(r=>r.id===id)?.batchId!==run.batchId))blocked.push('entry:batch-scope');
   }
   if(['verify','handoff'].includes(run.stage)&&!historical){
    const overall=overallReview(subset,statuses);if(!overall)blocked.push('entry:passing-overall-review');
    if(run.stage==='verify'&&run.progress!=='planned'&&(run.coverageRefs??[]).some(ref=>!expectedCoverage.includes(ref)))blocked.push('entry:declared-test-coverage');
    if(run.stage==='verify'&&run.progress!=='planned'&&overall&&!matchObject(run,overall.objectKey))blocked.push('entry:reviewed-object');
    if(run.stage==='handoff'&&!verificationState(subset,statuses,expectedCoverage).passed)blocked.push('entry:verification');
   }
  }
  const ready=ok(run)&&!blocked.length&&!waiting.length&&(!spec?.humanReview||required.length>0);
  const releaseReady=ready&&(!['implement','review'].includes(run.stage)||run.result==='passed');
  const status={id:run.id,stage:run.stage,progress:run.progress,applicability:run.applicability,documents:required,waiting,dependsOn:deps,blockedBy:blocked,ready,releaseReady};statuses.push(status);
  if(releaseReady)for(const older of statuses.slice(0,-1)){const old=state.stageRuns.find(r=>r.id===older.id);if(coversReview(run,old)||resolvesImplementation(run,old)){older.resolvedBy=run.id;older.releaseReady=true;}}
 }
 const batches=batchStates(state,statuses),verification=verificationState(state,statuses,expectedCoverage),overall=overallReview(state,statuses);
 for(const r of state.stageRuns.filter(r=>r.stage==='verify'&&r.progress==='done')){const effective=verification.coverage.filter(c=>(r.coverageRefs??[]).includes(c.ref));if(effective.length===(r.coverageRefs??[]).length&&effective.length&&effective.every(c=>c.result==='passed'&&c.runId!==r.id&&state.stageRuns.find(x=>x.id===c.runId)?.historyResultRefs?.includes(r.resultRef)))statuses.find(s=>s.id===r.id).resolvedBy=[...new Set(effective.map(c=>c.runId))];}
 return {runs:statuses,batches,verification,overall:overall?{id:overall.id,objectKey:overall.objectKey,resultRef:overall.resultRef}:null};
}
