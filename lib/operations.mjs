import {fail} from './io.mjs';
import {reviewStatus} from './approvals.mjs';
const controlled=['stageRuns','batches','reviewHistory','openChanges','outcome','currentRun'];
export async function applyOperations(directory,state,patch){
 for(const key of controlled)if(Object.hasOwn(patch,key))fail('DOMAIN_OPERATION_REQUIRED',`${key} is managed by domain operations.`,'Submit the actual record through operations; do not replace domain arrays.');
 if(patch.operations!==undefined&&!Array.isArray(patch.operations))fail('INVALID_STATE','operations must be an array.','Use the documented domain actions.');
 for(const op of patch.operations??[]){
  if(!op||typeof op!=='object')fail('INVALID_STATE','Invalid domain operation.','Read current state before updating.');
  if(op.type==='register-batches'){
   const status=await reviewStatus(directory,state),plan=status.documents.find(d=>state.documents.find(x=>x.path===d.path)?.kind==='plan');
   if(plan?.status!=='approved')fail('REVIEW_CHECK','Approve the current plan before registering its batches.','Review the actual plan content.');
   if(!Array.isArray(op.batches))fail('INVALID_STATE','register-batches needs batches.','Record stable B definitions.');
   for(const b of op.batches){const old=state.batches.find(x=>x.id===b.id);if(old&&JSON.stringify({...old,planBasis:undefined})!==JSON.stringify({...b,planBasis:undefined})&&state.stageRuns.some(r=>r.batchId===b.id&&r.progress!=='planned')&&(!(old.planBasis?.digest!==plan.digest||old.planBasis?.version!==plan.version)||!state.openChanges.some(c=>c.impactRef&&c.affectedRefs?.some(ref=>[old.definitionRef,...old.taskRefs,b.definitionRef,...b.taskRefs].includes(ref)))))fail('REVIEW_CHECK','Started batch changes need a revised plan and impact record.','Preserve the batch identity and assess affected work.');const next={...b,planBasis:{document:plan.path,version:plan.version,digest:plan.digest}};state.batches=old?state.batches.map(x=>x.id===b.id?next:x):[...state.batches,next];}
  }else if(op.type==='record-run'){
   const run=structuredClone(op.run);if(!run||(run.approvalBasis!==undefined||run.invalidCoverageRefs!==undefined))fail('INVALID_STATE','record-run needs a run; approvalBasis is tool-managed.','Submit actual run facts.');
   const old=state.stageRuns.find(x=>x.id===run.id);if(old?.progress==='done'&&JSON.stringify(old)!==JSON.stringify(run))fail('HISTORY_PROTECTED','Completed facts cannot be rewritten.','Record a new repair, recheck or retest; use set-applicability for current validity.');
   if(old?.progress==='planned'&&run.progress!=='planned'&&run.dependsOn===undefined&&!['implement','review','verify','handoff'].includes(run.stage)){const prior=state.stageRuns.slice(0,state.stageRuns.indexOf(old)).filter(r=>!['implement','review','verify','handoff'].includes(r.stage)).at(-1);if(prior)run.dependsOn=[prior.id];}
   state.stageRuns=old?state.stageRuns.map(x=>x.id===run.id?run:x):[...state.stageRuns,run];state.stageRuns=[...state.stageRuns.filter(r=>r.progress!=='planned'),...state.stageRuns.filter(r=>r.progress==='planned')];state.currentRun=run.id;
  }else if(op.type==='remove-planned-run'){const r=state.stageRuns.find(r=>r.id===op.runId);if(!r||r.progress!=='planned'||state.stageRuns.some(x=>x.dependsOn?.includes(r.id)||x.reviewOf?.includes(r.id)))fail('HISTORY_PROTECTED','Only unstarted, unreferenced arrangements may be removed.','Preserve actual execution and dependencies.');state.stageRuns=state.stageRuns.filter(x=>x.id!==r.id);if(state.currentRun===r.id)state.currentRun=null;}else if(op.type==='record-review')state.reviewHistory.push(structuredClone(op.record));
  else if(op.type==='record-change'){
   const c=structuredClone(op.change),old=state.openChanges.find(x=>x.id===c?.id);if(old&&old.ref!==c.ref)fail('HISTORY_PROTECTED','Preserve the original change reference.','Append its actual disposition.');state.openChanges=old?state.openChanges.map(x=>x.id===c.id?c:x):[...state.openChanges,c];
  }else if(op.type==='record-outcome')state.outcome={...state.outcome,...structuredClone(op.outcome)};
  else if(op.type==='set-current')state.currentRun=op.runId;
  else if(op.type==='set-applicability'){
   const r=state.stageRuns.find(r=>r.id===op.runId);if(!r)fail('INVALID_STATE','Unknown run for assessment.','Read current work.');r.applicability=op.applicability;
   if(op.applicability==='current'){if(!op.assessmentRef||!op.forObjectKey)fail('INVALID_STATE','An applicability recovery needs its target object and assessmentRef.','Record the actual assessment.');r.assessment={forObjectKey:op.forObjectKey,ref:op.assessmentRef,...(op.coverageRefs?{coverageRefs:structuredClone(op.coverageRefs)}:{})};if(r.stage==='verify'&&op.coverageRefs){if(!Array.isArray(op.coverageRefs)||op.coverageRefs.some(ref=>!r.coverageRefs.includes(ref)))fail('INVALID_STATE','Assessment must name declared coverage.','Assess the actual affected coverage.');r.invalidCoverageRefs=(r.invalidCoverageRefs??[]).filter(ref=>!op.coverageRefs.includes(ref));}}
  }else fail('INVALID_STATE','Unknown domain operation '+op.type,'Use register-batches, record-run, remove-planned-run, record-review, record-change, record-outcome, set-current or set-applicability.');
 }
 return state;
}
