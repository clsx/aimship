import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {readState,renderState} from '../lib/state.mjs';
import {run} from '../lib/cli.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {nativeDelivery,nativeObjectKey} from '../scripts/testing/native-delivery.mjs';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const table=view=>view.split('## Delivery progress')[1].split('Delivery conclusion:')[0];
async function batch(c,id){const work=await c.implement(id);await c.review({batchId:id,reviewOf:[work.id]});return work;}
async function allBatches(c){for(const id of c.batchIds)await batch(c,id);}

test('six business batches plus an overall repair retain six identities and their historical approvals',async t=>{
 const c=await nativeDelivery(t,{batchCount:6});await allBatches(c);const history=structuredClone(c.state.reviewHistory);
 const failed=await c.review({reviewScope:'overall',result:'failed'});
 const repair=await c.implement(undefined,{id:'overall-correction',workType:'repair',repairOf:[failed.id],historyResultRefs:[],objectKey:nativeObjectKey});
 await c.review({reviewScope:'overall',historyResultRefs:[failed.resultRef]});
 const before=await c.read();assert.equal(before.execution?.batches?.length??before.review.execution.batches.length,6);
 assert.equal(c.state.stageRuns.filter(r=>r.stage==='implement').length,7);assert.equal(c.state.batches.length,6);assert.deepEqual(c.state.reviewHistory,history);
 assert.ok((await c.read()).review.execution.overall);
 const work=c.state.stageRuns.filter(r=>r.stage==='implement').filter(r=>r.id!==repair.id).map(r=>r.id);
 await assert.rejects(c.review({reviewScope:'overall',reviewOf:work}),{code:'REVIEW_CHECK'});
 await renderState(c.dir,c.state.revision,c.version,c.runtime);assert.doesNotMatch(table(await fs.readFile(path.join(c.dir,'status.md'),'utf8')),/batches completed: 7/);
});
test('one batch automatically continues to its batch review then stops before the next business batch',async t=>{
 const c=await nativeDelivery(t,{batchCount:2}),work=await c.implement(c.batchIds[0]);
 let report=await c.read();assert.equal(report.session.action,'continue-implementation-review');assert.equal(report.session.stop,false);assert.equal(report.session.suggestNewSession,false);
 const history=structuredClone(c.state.reviewHistory);await c.review({batchId:c.batchIds[0],reviewOf:[work.id]});
 report=await c.read();assert.equal(report.session.action,'await-continue');assert.equal(report.session.stop,true);assert.equal(report.review.execution.batches[1].status,'planned');assert.deepEqual(c.state.reviewHistory,history);
 await c.op({type:'set-current',runId:work.id});assert.notEqual((await c.read()).session.action,'continue-implementation-review');
});
test('failed batch review permits scoped repair but never releases the next batch or erases failure',async t=>{
 const c=await nativeDelivery(t,{batchCount:2}),work=await c.implement(c.batchIds[0]),failed=await c.review({batchId:c.batchIds[0],result:'failed'});
 assert.equal((await c.read()).session.action,'continue-batch-repair');await assert.rejects(c.implement(c.batchIds[1]),{code:'REVIEW_CHECK'});
 await c.implement(c.batchIds[0],{workType:'repair',repairOf:[failed.id]});const checked=await c.review({batchId:c.batchIds[0],historyResultRefs:[failed.resultRef]});
 const report=await c.read();assert.equal(report.review.runs.find(r=>r.id===failed.id).resolvedBy,checked.id);assert.equal(c.state.stageRuns.find(r=>r.id===failed.id).result,'failed');assert.equal(report.session.stop,true);assert.equal(report.review.execution.batches[1].status,'planned');assert.equal(report.review.execution.batches[0].status,'complete');assert.ok(checked.reviewOf.includes(work.id));
 await c.op({type:'set-current',runId:failed.id});assert.notEqual((await c.read()).session.action,'continue-batch-repair');
});
test('explicit overall review stops before formal tests and retest summaries retain the failed RUN',async t=>{
 const c=await nativeDelivery(t);await allBatches(c);await c.review({reviewScope:'overall'});
 const bytes=await fs.readFile(path.join(c.dir,'.aimship/state.json'));const resumed=(await run(['resume',c.dir,'--rules-version',c.version],{sourceRoot:root})).data;
 assert.equal(resumed.session.stop,true);assert.equal(resumed.session.action,'await-continue');assert.equal(c.state.stageRuns.some(r=>r.stage==='verify'),false);assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),bytes);
 const failed=await c.verify({result:'failed'}),passed=await c.verify({historyResultRefs:[failed.resultRef]});
 const report=await c.read();assert.equal(report.review.execution.verification.passed,true);assert.equal(c.state.stageRuns.find(r=>r.id===failed.id).result,'failed');assert.deepEqual(passed.historyResultRefs,[failed.resultRef]);
});
test('content review and concrete questions retain their own stop despite batch continuation advice',async t=>{
 const c=await nativeDelivery(t);await c.implement(c.batchIds[0]);await c.save({operations:[{type:'record-run',run:{id:'clarify-export-columns',stage:'requirements',scope:'Clarify export columns',progress:'blocked',inputRefs:['source/decision.md'],outputRefs:['prd.md']}}],next:{action:'Choose the actual export columns',questionRef:'source/decision.md'}});assert.equal((await c.read()).session.action,'await-clarification');assert.equal((await c.read()).session.stop,true);
 const pending=await nativeDelivery(t,{initializeOnly:true});await pending.record({id:'req',stage:'requirements',outputRefs:['prd.md'],resultRef:'prd.md#requirements'});assert.equal((await pending.read()).session.action,'await-review');assert.equal((await pending.read()).session.stop,true);
});
test('numbered editorial headings preserve approval and generated execution progress does not alter plan design',async t=>{
 const c=await nativeDelivery(t),doc=c.state.documents.find(d=>d.kind==='plan'),file=path.join(c.dir,doc.path),prior=await reviewFingerprint(c.dir,c.state,doc);
 let n=0,body=(await fs.readFile(file,'utf8')).replace(/^## (.+)$/gm,(_,title)=>`## ${++n}. ${title}`);await fs.writeFile(file,body);
 const digest=await reviewFingerprint(c.dir,c.state,doc),basis={document:doc.path,version:doc.version,digest,sourceRef:'source/decision.md',summary:'Synthetic numbering only; same obligations.'};
 await c.op({type:'record-review',record:{...basis,id:'heading-self-check',kind:'self-check',result:'passed'}},{type:'record-review',record:{...basis,id:'heading-editorial',kind:'editorial',previousDigest:prior}});
 const approved=await reviewFingerprint(c.dir,c.state,doc);await batch(c,c.batchIds[0]);assert.equal(await reviewFingerprint(c.dir,c.state,doc),approved);assert.equal((await c.read()).review.documents.find(d=>d.path==='plan.md').status,'approved');
});
test('an overall repair never routes to a narrower batch recheck',async t=>{
 const c=await nativeDelivery(t);await allBatches(c);const failed=await c.review({reviewScope:'overall',result:'failed'});await c.implement(undefined,{workType:'repair',repairOf:[failed.id]});
 const report=await c.read();assert.equal(report.session.reviewScope,'overall-recheck');assert.equal(report.session.stop,false);assert.equal(report.completion.readyForAcceptance,false);
});
test('unidentified independent repair scope cannot be guessed from a scheduled review',async t=>{
 const c=await nativeDelivery(t);await allBatches(c);await c.review({reviewScope:'overall',result:'failed'});const revision=c.state.revision;
 await assert.rejects(c.implement(undefined,{workType:'repair'}),{code:'REVIEW_CHECK'});assert.equal((await c.read()).state.revision,revision);
});
test('repair review responsibility follows its explicit batch or overall basis',async t=>{
 for(const scope of ['batch','overall']){
  const c=await nativeDelivery(t);const work=await c.implement(c.batchIds[0]);let failed;
  if(scope==='batch')failed=await c.review({batchId:c.batchIds[0],result:'failed'});else{await c.review({batchId:c.batchIds[0]});failed=await c.review({reviewScope:'overall',result:'failed'});}
  await c.implement(scope==='batch'?c.batchIds[0]:undefined,{workType:'repair',repairOf:[failed.id]});const report=await c.read();assert.equal(report.session.reviewScope,scope==='batch'?'recheck':'overall-recheck');assert.equal(report.session.stop,false);assert.equal(report.completion.readyForAcceptance,false);assert.ok(work.id);
 }
});

test('only unstarted unreferenced arrangements may be removed through the domain operation',async t=>{
 const c=await nativeDelivery(t);await c.op({type:'record-run',run:{id:'future-verify',stage:'verify',scope:'Unstarted optional arrangement',progress:'planned',inputRefs:['testing.md'],outputRefs:['testing.md']}});
 await c.op({type:'remove-planned-run',runId:'future-verify'});assert.equal(c.state.stageRuns.some(r=>r.id==='future-verify'),false);
 const bytes=await fs.readFile(path.join(c.dir,'.aimship/state.json'));await assert.rejects(c.op({type:'remove-planned-run',runId:'native-requirements'}),{code:'HISTORY_PROTECTED'});assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),bytes);
 await c.op({type:'record-run',run:{id:'future-one',stage:'verify',scope:'Referenced arrangement',progress:'planned',inputRefs:[],outputRefs:['testing.md']}},{type:'record-run',run:{id:'future-two',stage:'handoff',scope:'Dependent arrangement',progress:'planned',dependsOn:['future-one'],inputRefs:[],outputRefs:['handoff.md']}});await assert.rejects(c.op({type:'remove-planned-run',runId:'future-one'}),{code:'HISTORY_PROTECTED'});
});
