// Test-only adapter for older test drivers. It submits real current-protocol
// operations; it does not bypass validation or rewrite saved revisions/history.
import {isDeepStrictEqual} from 'node:util';
import {initState as initialize,updateState as update,readState} from '../../lib/state.mjs';
import {hash} from '../../lib/io.mjs';
export const fixtureObjectKey=hash('Synthetic test object; not a real repository snapshot.');
const comparable=r=>{if(!r)return r;const n={...r};for(const key of ['approvalBasis','invalidCoverageRefs','sessionGroup'])delete n[key];if(n.applicability==='current')delete n.applicability;return n;};
export function semanticPatch(state,patch){
 const next=structuredClone(patch),operations=[...(next.operations??[])];delete next.operations;
 if(next.reviewHistory){
  const records=next.reviewHistory;delete next.reviewHistory;
  if(records.length<state.reviewHistory.length||!state.reviewHistory.every((r,i)=>isDeepStrictEqual(r,records[i]))){const error=new Error('Test requested a rewrite of immutable review history.');error.code='REVIEW_CHECK';throw error;}
  operations.push(...records.slice(state.reviewHistory.length).map(record=>({type:'record-review',record})));
 }
 if(next.openChanges){operations.push(...next.openChanges.filter(c=>!state.openChanges.some(o=>isDeepStrictEqual(o,c))).map(change=>({type:'record-change',change})));delete next.openChanges;}
 if(next.batches){operations.push({type:'register-batches',batches:next.batches});delete next.batches;}
 if(next.stageRuns){
  for(const record of next.stageRuns){const prior=state.stageRuns.find(r=>r.id===record.id);if(isDeepStrictEqual(comparable(prior),comparable(record)))continue;
   const run=structuredClone(record);delete run.approvalBasis;delete run.invalidCoverageRefs;
   if(prior?.progress==='done'&&isDeepStrictEqual(comparable({...prior,applicability:undefined,assessment:undefined}),comparable({...record,applicability:undefined,assessment:undefined})))operations.push({type:'set-applicability',runId:run.id,applicability:run.applicability,forObjectKey:run.objectKey??fixtureObjectKey,assessmentRef:run.resultRef});
   else operations.push({type:'record-run',run});
  }
  for(const old of state.stageRuns.filter(r=>!next.stageRuns.some(n=>n.id===r.id))){if(old.progress!=='planned'){const error=new Error('Test requested removal of historical execution.');error.code='INVALID_STATE';throw error;}operations.push({type:'remove-planned-run',runId:old.id});}
  delete next.stageRuns;
 }
 if(next.outcome){operations.push({type:'record-outcome',outcome:next.outcome});delete next.outcome;}
 if(Object.hasOwn(next,'currentRun')){operations.push({type:'set-current',runId:next.currentRun});delete next.currentRun;}
 return {...next,...(operations.length?{operations}:{})};
}
export async function semanticUpdate(directory,patch,revision,rulesVersion,runtime){const {state}=await readState(directory);return update(directory,semanticPatch(state,patch),revision,rulesVersion,runtime);}
export async function semanticInit(directory,input,rulesVersion,runtime){
 if(!(input.reviewHistory??[]).length&&!input.outcome&&(input.stageRuns??[]).every(r=>r.progress==='planned'||(['requirements','frame'].includes(r.stage)&&r.progress==='active')))return initialize(directory,input,rulesVersion,runtime);
 const desired=structuredClone(input),history=desired.reviewHistory??[],runs=desired.stageRuns??[],outcome=desired.outcome;
 delete desired.reviewHistory;delete desired.outcome;
 const pendingQuestion=desired.next?.questionRef;if(pendingQuestion)desired.next={...desired.next,questionRef:null};
 desired.stageRuns=runs.map(r=>{const planned={...r,progress:'planned'};for(const key of ['result','resultRef','approvalBasis','assessment','invalidCoverageRefs'])delete planned[key];return planned;});
 let state=await initialize(directory,desired,rulesVersion,runtime);
 if(history.length)state=await update(directory,{operations:history.map(record=>({type:'record-review',record}))},state.revision,rulesVersion,runtime);
 for(const run of runs.filter(r=>r.progress!=='planned'))state=await update(directory,{operations:[{type:'record-run',run},{type:'set-current',runId:run.id}]},state.revision,rulesVersion,runtime);
 if(outcome)state=await update(directory,{operations:[{type:'record-outcome',outcome}]},state.revision,rulesVersion,runtime);
 if(pendingQuestion)state=await update(directory,{next:input.next},state.revision,rulesVersion,runtime);
 if(desired.currentRun!==state.currentRun)state=await update(directory,{operations:[{type:'set-current',runId:desired.currentRun??null}]},state.revision,rulesVersion,runtime);
 return state;
}
