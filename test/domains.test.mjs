import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {nativeDelivery,nativeObjectKey} from '../scripts/testing/native-delivery.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {verificationState,evaluateRuns} from '../lib/domains.mjs';
import {artifactMap} from '../lib/documents.mjs';

const batch=(read,id)=>read.execution.batches.find(b=>b.id===id);
const runState=(read,id)=>read.review.runs.find(r=>r.id===id);
async function completeBatches(c) {
  for(const id of c.batchIds){await c.implement(id);await c.review({batchId:id});}
}

test('initialization admits planned work but rejects injected managed facts and approval bases',async t=>{
  const planned={id:'planned-requirements',stage:'requirements',scope:'Synthetic future requirement work',progress:'planned',inputRefs:[],outputRefs:[]};
  const initialized=await nativeDelivery(t,{initializeOnly:true,initPatch:{stageRuns:[planned],currentRun:planned.id}});
  assert.equal(initialized.state.currentRun,planned.id);assert.equal(initialized.state.stageRuns[0].progress,'planned');
  const cases=[
    {batches:[{id:'B-001',definitionRef:'plan.md#B-001',taskRefs:['plan.md#TASK-001'],dependsOn:[],planBasis:{document:'plan.md',version:'1',digest:'a'.repeat(64)}}]},
    {stageRuns:[{...planned,progress:'done',result:'passed',resultRef:'prd.md#requirements'}]},
    {stageRuns:[{...planned,approvalBasis:[{document:'prd.md',digest:'a'.repeat(64),recordId:'injected'}]}]},
    {reviewHistory:[{id:'injected',kind:'approved',decision:'explicit-approval',document:'prd.md',version:'1',digest:'a'.repeat(64),sourceRef:'source/decision.md',summary:'Injected approval'}]},
    {openChanges:[{id:'CHG-001',ref:'source/decision.md',status:'open',impactRef:'source/decision.md',affectedRefs:['plan.md#B-001']}]},
    {outcome:{goal:'met',goalConclusionRef:'source/decision.md',acceptance:'accepted',acceptanceRef:'source/decision.md'}}
  ];
  for(const initPatch of cases)await assert.rejects(nativeDelivery(t,{initializeOnly:true,initPatch}),e=>e.code==='INVALID_STATE',JSON.stringify(Object.keys(initPatch)));
});

test('native protocol records a business batch separately from implementation and its required batch review',async t=>{
  const c=await nativeDelivery(t,{batchCount:2});
  assert.equal(c.state.schemaVersion,5);assert.equal(c.state.protocolVersion,2);
  const implementation=await c.implement('B-001');
  let read=await c.read();assert.equal(read.execution.batches.length,2);assert.equal(batch(read,'B-001').status,'await-review');
  assert.equal(c.state.batches.find(b=>b.id==='B-001').definitionRef,'plan.md#B-001');
  assert.ok(c.state.batches.find(b=>b.id==='B-001').planBasis);
  const reviewed=await c.review({batchId:'B-001'});
  read=await c.read();assert.equal(batch(read,'B-001').status,'complete');assert.equal(runState(read,reviewed.id).releaseReady,true);
  assert.equal(read.session.stop,true);assert.ok(!c.state.stageRuns.some(r=>r.batchId==='B-002'));
  assert.deepEqual(c.state.stageRuns.find(r=>r.id===implementation.id),implementation);
  assert.equal(read.completion.standardComplete,false);
});

test('failed batch review permits same-batch repair but never releases its dependent business batch early',async t=>{
  const c=await nativeDelivery(t,{batchCount:2}),first=await c.implement('B-001');
  const failed=await c.review({batchId:'B-001',result:'failed'}),failedBytes=structuredClone(failed),before=c.state.revision;
  await assert.rejects(c.implement('B-002',{id:'blocked-second-batch'}));
  assert.equal(c.state.revision,before);assert.equal(batch(await c.read(),'B-001').status,'needs-repair');
  const repair=await c.implement('B-001',{workType:'repair',repairOf:[failed.id]});
  await c.review({batchId:'B-001',reviewOf:[first.id,repair.id],historyResultRefs:[failed.resultRef]});
  const read=await c.read();assert.equal(read.execution.batches.length,2);assert.equal(batch(read,'B-001').status,'complete');
  assert.deepEqual(c.state.stageRuns.find(r=>r.id===failed.id),failedBytes);assert.equal(runState(read,failed.id).resolvedBy,c.state.currentRun);
  assert.equal(c.state.stageRuns.filter(r=>r.stage==='implement' && r.batchId==='B-001').length,2);
  await c.implement('B-002',{id:'blocked-second-batch'});
  assert.ok(c.state.stageRuns.some(r=>r.id==='blocked-second-batch'));
});

test('passing batches do not replace overall review and an overall-review request stops before formal verification',async t=>{
  const c=await nativeDelivery(t,{batchCount:2});await completeBatches(c);
  assert.equal((await c.read()).execution.batches.every(b=>b.status==='complete'),true);
  await assert.rejects(c.verify());
  const overall=await c.review({reviewScope:'overall'}),read=await c.read();
  assert.equal(runState(read,overall.id).releaseReady,true);assert.equal(read.session.stop,true);
  assert.equal(c.state.stageRuns.some(r=>r.stage==='verify'),false);assert.equal(read.completion.readyForAcceptance,false);
});

test('a narrower passing batch review cannot clear an unresolved overall failure',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);
  const failed=await c.review({reviewScope:'overall',result:'failed'});
  await c.review({batchId:'B-001'});
  await assert.rejects(c.verify());
  let read=await c.read();assert.equal(runState(read,failed.id).resolvedBy,undefined);assert.equal(read.execution.verification.passed,false);
  const fixed=await c.review({reviewScope:'overall',historyResultRefs:[failed.resultRef]});
  read=await c.read();assert.equal(runState(read,failed.id).resolvedBy,fixed.id);assert.equal(c.state.stageRuns.find(r=>r.id===failed.id).result,'failed');
  await c.verify();assert.equal((await c.read()).execution.verification.passed,true);
});

test('partial retests resolve only their covered failures and retain the failed RUN',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});
  const failed=await c.verify({result:'failed'}),snapshot=structuredClone(failed);
  await c.verify({coverageRefs:[c.caseRefs[0]],historyResultRefs:[failed.resultRef]});
  let read=await c.read();assert.equal(read.execution.verification.passed,false);assert.equal(read.completion.readyForAcceptance,false);
  await assert.rejects(c.handoff());
  await c.verify({coverageRefs:[c.caseRefs[1]],historyResultRefs:[failed.resultRef]});
  read=await c.read();assert.equal(read.execution.verification.passed,true);assert.deepEqual(c.state.stageRuns.find(r=>r.id===failed.id),snapshot);
  assert.equal(c.state.stageRuns.filter(r=>r.stage==='verify').length,3);await c.handoff();
  assert.equal((await c.read()).completion.readyForAcceptance,true);
});

test('ordinary plan execution updates keep the approved design fingerprint and review history',async t=>{
  const c=await nativeDelivery(t),doc=c.state.documents.find(d=>d.kind==='plan');
  const before=await reviewFingerprint(c.dir,c.state,doc),history=structuredClone(c.state.reviewHistory);
  await c.append('plan','execution','### Recorded development note\n\nOnly execution evidence changed; TASK and business dependencies above remain unchanged.');
  await c.save({next:{action:'Continue the current authorized batch'}});
  assert.equal(await reviewFingerprint(c.dir,c.state,doc),before);assert.deepEqual(c.state.reviewHistory,history);
  assert.equal((await c.read()).review.documents.find(d=>d.path==='plan.md').status,'approved');
});

test('a material B2 plan change preserves B1 closure and historical approvals while requiring current approval',async t=>{
  const c=await nativeDelivery(t,{batchCount:2});await completeBatches(c);
  const history=structuredClone(c.state.reviewHistory),file=path.join(c.dir,'plan.md');
  const original=await fs.readFile(file,'utf8');
  assert.ok(original.includes('Export work 2;'));
  await fs.writeFile(file,original.replace('Export work 2;','Export work 2 with revised cancellation behavior;'));
  await c.change('CHG-001','The B-002 goal changes materially; B-001 output and its prior review remain applicable. Assess B-002 implementation and its batch review against the revised goal.');
  await c.save({documents:c.state.documents.map(d=>d.path==='plan.md'?{...d,version:'2'}:d),operations:[{type:'record-change',change:{id:'CHG-001',ref:'change-log.md#CHG-001',status:'open',impactRef:'change-log.md#CHG-001',affectedRefs:['plan.md#B-002']}}]});
  let read=await c.read();
  assert.equal(batch(read,'B-001').status,'complete');assert.equal(batch(read,'B-002').status,'needs-review');
  assert.deepEqual(c.state.reviewHistory,history);
  const revision=c.state.revision;
  await assert.rejects(c.implement('B-002',{id:'revised-B2-before-approval'}),e=>e.code==='REVIEW_CHECK');
  assert.equal(c.state.revision,revision);
  await c.save({next:{action:'Review the revised B2 plan goal'}});
  await c.approve(['plan.md']);
  read=await c.read();assert.equal(read.review.documents.find(d=>d.path==='plan.md').status,'approved');
  assert.deepEqual(c.state.reviewHistory.slice(0,history.length),history);
  assert.equal(batch(read,'B-001').status,'complete');assert.equal(batch(read,'B-002').status,'needs-review','a new plan approval does not manufacture an implementation recheck');
});

test('a prior verification assessment applies only to its specifically assessed object',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});
  const verified=await c.verify();assert.equal((await c.read()).execution.verification.passed,true);
  const object2='2'.repeat(64),object3='3'.repeat(64);
  await c.review({reviewScope:'overall',objectKey:object2});
  assert.equal((await c.read()).execution.verification.passed,false);
  await assert.rejects(c.op({type:'set-applicability',runId:verified.id,applicability:'current',assessmentRef:'source/decision.md'}),e=>e.code==='INVALID_STATE');
  await c.op({type:'set-applicability',runId:verified.id,applicability:'current',forObjectKey:object2,assessmentRef:'source/decision.md'});
  assert.deepEqual(c.state.stageRuns.find(r=>r.id===verified.id).assessment,{forObjectKey:object2,ref:'source/decision.md'});
  assert.equal((await c.read()).execution.verification.passed,true);
  await c.review({reviewScope:'overall',objectKey:object3});
  assert.equal((await c.read()).execution.verification.passed,false,'O2 applicability evidence does not cover O3');
});

test('a changed case invalidates only its recorded coverage while retaining unaffected verification results',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});
  const verified=await c.verify(),history=structuredClone(c.state.reviewHistory);
  await c.setSection('testing','cases',`| TC-001 | AC-001 | Select one order, cancel the request, and verify that no export is emitted. |\n| TC-002 | AC-001 | Select two orders and compare each exported total with its stored value. |`);
  await c.change('CHG-001','TC-001 now includes cancellation. Its prior result needs revalidation; TC-002 inputs and expected totals remain applicable.');
  await c.save({documents:c.state.documents.map(d=>d.path==='testing.md'?{...d,version:'2'}:d),operations:[{type:'record-change',change:{id:'CHG-001',ref:'change-log.md#CHG-001',status:'open',impactRef:'change-log.md#CHG-001',affectedRefs:[c.caseRefs[0]]}}]});
  let read=await c.read(),saved=c.state.stageRuns.find(r=>r.id===verified.id);
  assert.deepEqual(saved.invalidCoverageRefs,[c.caseRefs[0]]);
  assert.equal(read.execution.verification.coverage.find(x=>x.ref===c.caseRefs[0]).result,'not-run');
  assert.equal(read.execution.verification.coverage.find(x=>x.ref===c.caseRefs[1]).result,'passed');
  assert.equal(read.execution.verification.passed,false);assert.deepEqual(c.state.reviewHistory,history);
  await c.approve(['testing.md']);
  await c.verify({coverageRefs:[c.caseRefs[0]],historyResultRefs:[verified.resultRef]});
  read=await c.read();assert.equal(read.execution.verification.passed,true);
  assert.equal(read.execution.verification.coverage.find(x=>x.ref===c.caseRefs[1]).runId,verified.id);
});

test('batch implementation impact propagates through reviewOf to its batch and overall reviews',async t=>{
  const c=await nativeDelivery(t,{batchCount:2});await completeBatches(c);
  const overall=await c.review({reviewScope:'overall'}),impl=c.state.stageRuns.find(r=>r.stage==='implement'&&r.batchId==='B-002');
  const secondReview=c.state.stageRuns.find(r=>r.stage==='review'&&r.batchId==='B-002');
  const file=path.join(c.dir,'plan.md'),body=await fs.readFile(file,'utf8');
  await fs.writeFile(file,body.replace('Export work 2;','Export work 2 with revised cancellation behavior;'));
  await c.change('CHG-001','The revised B-002 goal affects its implementation and every review covering that implementation, including the overall review. B-001 remains applicable.');
  await c.save({documents:c.state.documents.map(d=>d.path==='plan.md'?{...d,version:'2'}:d),operations:[{type:'record-change',change:{id:'CHG-001',ref:'change-log.md#CHG-001',status:'open',impactRef:'change-log.md#CHG-001',affectedRefs:['plan.md#B-002']}}]});
  for(const id of [impl.id,secondReview.id,overall.id])assert.equal(c.state.stageRuns.find(r=>r.id===id).applicability,'needs-review',id);
  const read=await c.read();assert.equal(batch(read,'B-001').status,'complete');assert.equal(read.execution.overall,null);
});

test('new assessment and impact evidence must exist locally before state can be saved',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});const verified=await c.verify();
  const file=path.join(c.dir,'.aimship/state.json'),before=await fs.readFile(file),revision=c.state.revision;
  const actions=[
    {type:'set-applicability',runId:verified.id,applicability:'current',forObjectKey:nativeObjectKey,assessmentRef:'source/missing-assessment.md'},
    {type:'record-change',change:{id:'CHG-001',ref:'source/decision.md',status:'open',impactRef:'source/missing-impact.md',affectedRefs:[c.caseRefs[0]]}}
  ];
  for(const action of actions){await assert.rejects(c.op(action),e=>e.code==='DOCUMENT_CHECK');assert.deepEqual(await fs.readFile(file),before);assert.equal(c.state.revision,revision);}
});

test('an approved scoped plan revision permits updating an already started business-batch definition',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);
  const history=structuredClone(c.state.reviewHistory),definition={id:'B-001',definitionRef:'plan.md#B-001',taskRefs:['plan.md#TASK-001','plan.md#TASK-002'],dependsOn:[]};
  await assert.rejects(c.op({type:'register-batches',batches:[definition]}),e=>e.code==='REVIEW_CHECK');
  await c.setSection('plan','tasks','| TASK-001 | B-001 | Implement scoped selected-order export for REQ-001 / AC-001; preserve exact totals. |\n| TASK-002 | B-001 | Handle cancellation for REQ-001 / AC-001; emit no incomplete export. |');
  await c.change('CHG-001','Add TASK-002 to B-001. Preserve the business batch identity and completed history; assess this batch against its revised approved scope.');
  await c.save({documents:c.state.documents.map(d=>d.path==='plan.md'?{...d,version:'2'}:d),operations:[{type:'record-change',change:{id:'CHG-001',ref:'change-log.md#CHG-001',status:'open',impactRef:'change-log.md#CHG-001',affectedRefs:['plan.md#B-001']}}]});
  await assert.rejects(c.op({type:'register-batches',batches:[definition]}),e=>e.code==='REVIEW_CHECK');
  await c.approve(['plan.md']);await c.op({type:'register-batches',batches:[definition]});
  assert.equal(c.state.batches.length,1);assert.deepEqual(c.state.batches[0].taskRefs,definition.taskRefs);
  assert.equal(c.state.batches[0].planBasis.version,'2');assert.deepEqual(c.state.reviewHistory.slice(0,history.length),history);
  assert.equal(batch(await c.read(),'B-001').status,'needs-review');
});

test('goal achievement and actual user acceptance remain separate after complete verification and handoff',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});await c.verify();await c.handoff();
  assert.equal((await c.read()).completion.readyForAcceptance,true);assert.equal((await c.read()).completion.standardComplete,false);
  await c.op({type:'record-outcome',outcome:{goal:'met',goalConclusionRef:'handoff.md#goals'}});
  assert.equal((await c.read()).completion.standardComplete,false);
  await c.op({type:'record-outcome',outcome:{acceptance:'accepted',acceptanceRef:'source/decision.md'}});
  assert.equal((await c.read()).completion.standardComplete,true);
});

test('raw control-field patches cannot become a second path around domain operations',async t=>{
  const c=await nativeDelivery(t),file=path.join(c.dir,'.aimship/state.json'),bytes=await fs.readFile(file),revision=c.state.revision;
  for(const key of ['stageRuns','batches','reviewHistory','openChanges','outcome','currentRun']){
    await assert.rejects(c.save({[key]:structuredClone(c.state[key])}),e=>e.code==='DOMAIN_OPERATION_REQUIRED');
    assert.deepEqual(await fs.readFile(file),bytes,key);assert.equal(c.state.revision,revision,key);
  }
  assert.equal(c.state.stageRuns.some(r=>r.objectKey===nativeObjectKey),false,'fixture design stages did not manufacture code execution');
});

test('retired coverage stays historical and does not count against the current expected verification scope',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});
  const mixed=await c.verify({result:'mixed',coverageResults:[{ref:c.caseRefs[0],result:'passed'},{ref:c.caseRefs[1],result:'failed'}]});
  const read=await c.read();assert.equal(read.execution.verification.passed,false);
  const current=verificationState(c.state,read.review.runs,[c.caseRefs[0]]);
  assert.equal(current.passed,true);assert.deepEqual(current.coverage.map(x=>x.ref),[c.caseRefs[0]]);
  assert.equal(c.state.stageRuns.find(r=>r.id===mixed.id).coverageResults[1].result,'failed');
});

test('accepted work requires reopening before new engineering and the old handoff cannot close new results',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});await c.verify();const oldHandoff=await c.handoff();
  await c.op({type:'record-outcome',outcome:{goal:'met',goalConclusionRef:'handoff.md#goals',acceptance:'accepted',acceptanceRef:'source/decision.md'}});
  assert.equal((await c.read()).completion.standardComplete,true);
  await assert.rejects(c.implement('B-001',{id:'after-accepted',objectKey:'2'.repeat(64)}),e=>e.code==='INVALID_STATE');
  await c.save({cycle:c.state.cycle+1,closureRefs:['handoff.md#outcomes'],operations:[{type:'record-outcome',outcome:{goal:'in-progress',acceptance:'not-recorded'}}]});
  await c.implement('B-001',{id:'after-reopen',objectKey:'2'.repeat(64)});
  const read=await c.read();assert.equal(read.completion.readyForAcceptance,false);assert.equal(read.completion.standardComplete,false);
  assert.equal(c.state.outcome.acceptance,'not-recorded');assert.ok(c.state.stageRuns.some(r=>r.id===oldHandoff.id));
  await assert.rejects(c.op({type:'record-outcome',outcome:{goal:'met',acceptance:'accepted',acceptanceRef:'source/decision.md'}}));
});

test('recovering unknown applicability rechecks current upstream approval rather than reusing the old basis',async t=>{
  const c=await nativeDelivery(t),impl=await c.implement('B-001');
  await c.op({type:'set-applicability',runId:impl.id,applicability:'unknown'});
  const file=path.join(c.dir,'prd.md'),raw=await fs.readFile(file,'utf8');
  assert.ok(raw.includes('Export the selected orders'));await fs.writeFile(file,raw.replace('Export the selected orders','Export the selected active orders'));
  await c.change('CHG-001','Change the requirement to active orders only. Assess REQ-001 and the dependent engineering scope before restoring applicability.');
  await c.save({documents:c.state.documents.map(d=>d.path==='prd.md'?{...d,version:'2'}:d),operations:[{type:'record-change',change:{id:'CHG-001',ref:'change-log.md#CHG-001',status:'open',impactRef:'change-log.md#CHG-001',affectedRefs:['prd.md#REQ-001']}}]});
  const revision=c.state.revision;
  await assert.rejects(c.op({type:'set-applicability',runId:impl.id,applicability:'current',forObjectKey:nativeObjectKey,assessmentRef:'source/decision.md'}),e=>e.code==='REVIEW_CHECK');
  assert.equal(c.state.revision,revision);assert.equal(c.state.stageRuns.find(r=>r.id===impl.id).applicability,'unknown');
});

test('a scoped applicability assessment cannot reuse undeclared coverage or broaden one case across objects',async t=>{
  const c=await nativeDelivery(t);await completeBatches(c);await c.review({reviewScope:'overall'});const verified=await c.verify();
  const object2='2'.repeat(64);await c.review({reviewScope:'overall',objectKey:object2});
  await assert.rejects(c.op({type:'set-applicability',runId:verified.id,applicability:'current',forObjectKey:object2,assessmentRef:'source/decision.md',coverageRefs:['testing.md#TC-999']}),e=>e.code==='INVALID_STATE');
  await c.op({type:'set-applicability',runId:verified.id,applicability:'current',forObjectKey:object2,assessmentRef:'source/decision.md',coverageRefs:[c.caseRefs[0]]});
  const read=await c.read();assert.equal(read.execution.verification.passed,false);
  assert.equal(read.execution.verification.coverage.find(x=>x.ref===c.caseRefs[0]).result,'passed');
  assert.equal(read.execution.verification.coverage.find(x=>x.ref===c.caseRefs[1]).result,'not-run');
  assert.deepEqual(c.state.stageRuns.find(r=>r.id===verified.id).assessment.coverageRefs,[c.caseRefs[0]]);
});

test('impact on B1 propagates through registered B2 dependencies even without explicit run dependencies',async t=>{
  const c=await nativeDelivery(t,{batchCount:2});await completeBatches(c);
  assert.deepEqual(c.state.batches.find(b=>b.id==='B-002').dependsOn,['B-001']);
  const second=c.state.stageRuns.filter(r=>r.batchId==='B-002');assert.ok(second.every(r=>!r.dependsOn?.length));
  await c.change('CHG-001','B-001 output changes materially. Its registered dependent B-002 implementation and batch review must be reassessed.');
  await c.op({type:'record-change',change:{id:'CHG-001',ref:'change-log.md#CHG-001',status:'open',impactRef:'change-log.md#CHG-001',affectedRefs:['plan.md#B-001']}});
  for(const r of second)assert.equal(c.state.stageRuns.find(x=>x.id===r.id).applicability,'needs-review',r.id);
  const read=await c.read();assert.equal(batch(read,'B-001').status,'needs-review');assert.equal(batch(read,'B-002').status,'needs-review');
});

test('an approved plan document does not complete its selected planned execution before implementation starts',async t=>{
  const c=await nativeDelivery(t),read=await c.read(),map=await artifactMap();
  assert.equal(read.review.documents.find(d=>d.path==='plan.md').status,'approved');
  const state=structuredClone(c.state),selected=state.stageRuns.find(r=>r.stage==='plan');
  selected.progress='planned';delete selected.approvalBasis;delete selected.resultRef;delete selected.result;
  const implementation={id:'active-with-selected-plan',stage:'implement',scope:'Synthetic active business batch',progress:'active',workType:'batch',batchId:'B-001',inputRefs:['plan.md#tasks'],outputRefs:['plan.md']};
  state.stageRuns.push(implementation);
  const evaluated=evaluateRuns(state,read.review.documents,map),actual=evaluated.runs.find(r=>r.id===implementation.id);
  assert.ok(actual.blockedBy.includes('entry:selected-plan'));assert.equal(actual.ready,false);
  assert.equal(actual.blockedBy.includes('approval:plan'),false,'approved content and unfinished plan execution are separate facts');
});

test('prototype ordering and explicit dependencies retain their real design boundary when planned runs first start',async t=>{
  const future=(id,stage)=>({id,stage,scope:'Synthetic selected '+stage,progress:'planned',inputRefs:[],outputRefs:[]});
  for(const prototypeFirst of [false,true]){
    const requirement=future('selected-requirements','requirements'),prototype=future('selected-prototype','prototype'),design=future('selected-design','tech-design');
    const c=await nativeDelivery(t,{initializeOnly:true,initPatch:{stageRuns:[requirement,...(prototypeFirst?[prototype,design]:[design,prototype])],currentRun:requirement.id}});
    await fs.mkdir(path.join(c.dir,'prototype'));
    await fs.writeFile(path.join(c.dir,'prototype/index.html'),'<!doctype html><title>Synthetic export prototype</title><button>Export selected orders</button>');
    await c.save({documents:[...c.state.documents,{kind:'prototype',path:'prototype/index.html',mode:'new',version:'1'}]});
    await c.record({...requirement,progress:'done',result:'passed',outputRefs:['prd.md'],resultRef:'prd.md#requirements'});await c.approve(['prd.md']);
    const startDesign=()=>c.record({...design,progress:'active',outputRefs:['tech-design.md']});
    if(prototypeFirst){
      const revision=c.state.revision;await assert.rejects(startDesign(),e=>e.code==='REVIEW_CHECK');assert.equal(c.state.revision,revision);
      await c.record({...prototype,progress:'done',result:'passed',outputRefs:['prototype/index.html'],resultRef:'prototype/index.html'});
      await assert.rejects(startDesign(),e=>e.code==='REVIEW_CHECK','prototype completion still needs its actual approval');
      await c.approve(['prototype/index.html']);await startDesign();
      assert.deepEqual(c.state.stageRuns.find(r=>r.id===design.id).dependsOn,[prototype.id]);
    }else{
      await startDesign();assert.deepEqual(c.state.stageRuns.find(r=>r.id===design.id).dependsOn,[requirement.id]);
      const read=await c.read(),status=read.review.runs.find(r=>r.id===design.id);
      assert.equal(status.blockedBy.includes('entry:selected-prototype'),false,'a later selected prototype does not gate earlier design');
      const explicit=structuredClone(c.state);explicit.stageRuns.find(r=>r.id===design.id).dependsOn=[prototype.id];
      const evaluation=evaluateRuns(explicit,read.review.documents,await artifactMap());
      assert.ok(evaluation.runs.find(r=>r.id===design.id).blockedBy.includes('entry:selected-prototype'),'an explicit prototype dependency is still visible even before that prototype starts');
    }
  }
});
