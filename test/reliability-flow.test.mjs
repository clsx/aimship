import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {spawnSync} from 'node:child_process';
import {initState,updateState,readState} from '../lib/state.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
const definitions=[['req','requirements','prd'],['design','tech-design','tech-design'],['cases','test-design','testing'],['plan','plan','plan'],['imp1','implement','plan'],['rev1','review','review'],['imp2','implement','plan'],['rev2','review','review'],['overall','review','review'],['verify','verify','testing'],['handoff','handoff','handoff']];
async function setup(t,{selected=definitions,partial=false}={}) {
 const dataRoot=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-reliability-flow-'))),dir=path.join(dataRoot,'delivery');
 t.after(()=>fs.rm(dataRoot,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'source'),{recursive:true});
 await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic fixture request only; no actual business work or approval.');
 await fs.writeFile(path.join(dir,'source/limited.md'),'Synthetic explicitly limited commission, not standard complete delivery.');
 const docs=[...new Set(selected.map(x=>x[2]))].map(kind=>({kind,path:`${kind}.md`,mode:'reused',version:'synthetic-1',basisRef:'source/request.md'}));
 for(const doc of docs)await fs.writeFile(path.join(dir,doc.path),`# Synthetic adopted ${doc.kind}\n`+['rev1','rev2','overall','repair','independent'].map(id=>`## ${id}\nSynthetic evidence for ${id}.\n`).join(''));
 const stageRuns=selected.map(([id,stage,kind])=>({id,stage,scope:`Synthetic ${id}`,progress:'planned',inputRefs:[],outputRefs:[`${kind}.md`],...(stage==='review' && ['rev1','rev2','overall'].includes(id)?{reviewOf:id==='overall'?['imp1','imp2']:[id==='rev1'?'imp1':'imp2'],overall:id==='overall'}:{})}));
 const runtime={version,activeVersion:version,dataRoot};
 let state=await initState(dir,{language:'en',goal:{summary:'Synthetic delivery',endpoint:'Agreed synthetic endpoint'},goalRef:'prd.md',deliveryPolicy:{version:1,...(partial?{partialRef:'source/limited.md'}:{})},documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:docs,stageRuns,currentRun:stageRuns[0]?.id??null},version,runtime);
 const save=async patch=>state=await updateState(dir,patch,state.revision,version,runtime);
 const finish=async(id,result='passed')=>{
  const run=state.stageRuns.find(r=>r.id===id);
  await save({stageRuns:state.stageRuns.map(r=>r.id===id?{...r,progress:'done',...(result===null?{}:{result}),resultRef:r.stage==='review'?`review.md#${id}`:r.outputRefs[0]}:r),currentRun:id});
  if(['requirements','tech-design','test-design','plan'].includes(run.stage))await save({reviewHistory:await approveFixture(dir,state,run.outputRefs)});
 };
 const start=id=>save({stageRuns:state.stageRuns.map(r=>r.id===id?{...r,progress:'active'}:r),currentRun:id});
 return {dir,runtime,save,finish,start,get state(){return state}};
}
async function readyToReview(c){for(const id of ['req','design','cases','plan','imp1'])await c.finish(id);}
function correction(c,oldId,{id='repair',reviewOf,overall}={}) {
 const old=c.state.stageRuns.find(r=>r.id===oldId);
 return {id,stage:'review',scope:'Corrective review of the same synthetic object',progress:'done',result:'passed',resultRef:`review.md#${id}`,historyResultRefs:[old.resultRef],inputRefs:[],outputRefs:['review.md'],reviewOf:reviewOf??old.reviewOf,overall:overall??old.overall};
}
function insertAfter(runs,id,newRun){const at=runs.findIndex(r=>r.id===id);return [...runs.slice(0,at+1),newRun,...runs.slice(at+1)];}

test('failed or inconclusive batch review is saved but cannot release the next batch',async t=>{
 for(const result of ['failed','mixed','unknown','not-run',null]) {
  const c=await setup(t);await readyToReview(c);await c.finish('rev1',result);
  let read=await readState(c.dir),review=read.review.runs.find(r=>r.id==='rev1');
  assert.equal(review.ready,true,'execution record remains completed');assert.equal(review.releaseReady,false);assert.equal(read.review.canProceed,false);assert.equal(read.session.action,'resolve-current');
  assert.ok(read.review.runs.find(r=>r.id==='imp2').blockedBy.includes('rev1'));
  const before=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
  await assert.rejects(c.start('imp2'),{code:'REVIEW_CHECK'});
  assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),before,'rejected advancement does not save state');
  await c.save({currentRun:null});assert.equal((await readState(c.dir)).review.canProceed,false);
 }
});

test('corrective review must preserve failure evidence and matching coverage before continuation',async t=>{
 const c=await setup(t);await readyToReview(c);await c.finish('rev1','failed');const failed=structuredClone(c.state.stageRuns.find(r=>r.id==='rev1'));
 const wrong=correction(c,'rev1',{reviewOf:['imp2']});
 await assert.rejects(c.save({stageRuns:insertAfter(c.state.stageRuns,'rev1',wrong),currentRun:wrong.id}),{code:'REVIEW_CHECK'});
 const noHistory=correction(c,'rev1');delete noHistory.historyResultRefs;
 await assert.rejects(c.save({stageRuns:insertAfter(c.state.stageRuns,'rev1',noHistory),currentRun:noHistory.id}),{code:'REVIEW_CHECK'});
 const repair=correction(c,'rev1');await c.save({stageRuns:insertAfter(c.state.stageRuns,'rev1',repair),currentRun:repair.id});
 const read=await readState(c.dir),status=read.review.runs.find(r=>r.id==='rev1');assert.equal(status.releaseReady,true);assert.equal(status.resolvedBy,'repair');
 assert.deepEqual(c.state.stageRuns.find(r=>r.id==='rev1'),failed);await c.start('imp2');assert.equal((await readState(c.dir)).review.canProceed,true);
});

test('failed overall review blocks verification, then matching correction permits full completion',async t=>{
 const c=await setup(t);for(const id of ['req','design','cases','plan','imp1','rev1','imp2','rev2'])await c.finish(id);
 await c.finish('overall','failed');await assert.rejects(c.start('verify'),{code:'REVIEW_CHECK'});
 const batchOnly=correction(c,'overall',{overall:false});await assert.rejects(c.save({stageRuns:insertAfter(c.state.stageRuns,'overall',batchOnly),currentRun:'repair'}),{code:'REVIEW_CHECK'});
 const repair=correction(c,'overall');await c.save({stageRuns:insertAfter(c.state.stageRuns,'overall',repair),currentRun:'repair'});
 await c.finish('verify');await c.finish('handoff');let read=await readState(c.dir);assert.equal(read.completion.readyForAcceptance,true);assert.equal(read.session.action,'assess-outcome');assert.equal(read.session.continuation,null);assert.match(read.session.instruction,/goal conclusion and acceptance/);
 await c.save({outcome:{goal:'met',goalConclusionRef:'handoff.md',acceptance:'accepted',acceptanceRef:'source/limited.md'}});read=await readState(c.dir);assert.equal(read.completion.standardComplete,true);assert.equal(read.session.action,'finished');
});

test('independent review work is not blocked by an unrelated failed review',async t=>{
 const c=await setup(t,{partial:true});await readyToReview(c);await c.finish('rev1','failed');
 const independent={id:'independent',stage:'review',scope:'Independent existing work, not a repair',progress:'active',dependsOn:[],inputRefs:[],outputRefs:['review.md']};
 await c.save({stageRuns:[...c.state.stageRuns,independent],currentRun:independent.id});
 const read=await readState(c.dir);assert.equal(read.review.canProceed,true);assert.equal(read.review.runs.find(r=>r.id==='rev1').releaseReady,false);assert.equal(read.completion.standardComplete,false);
 await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='independent'?{...r,progress:'done',result:'failed',resultRef:'review.md#independent'}:r)});
 const repair={id:'repair',stage:'review',scope:'A different independent object',progress:'done',result:'passed',resultRef:'review.md#repair',historyResultRefs:['review.md#independent'],inputRefs:[],outputRefs:['review.md']};
 await assert.rejects(c.save({stageRuns:[...c.state.stageRuns,repair],currentRun:repair.id}),{code:'REVIEW_CHECK'});
 repair.scope=independent.scope;await c.save({stageRuns:[...c.state.stageRuns,repair],currentRun:repair.id});
 const repaired=await readState(c.dir);assert.equal(repaired.review.runs.find(r=>r.id==='independent').releaseReady,true);assert.equal(repaired.review.runs.find(r=>r.id==='rev1').releaseReady,false);
});

test('last registered approved requirements remain resumable until a scope conclusion is recorded',async t=>{
 const c=await setup(t,{selected:definitions.slice(0,1),partial:true});await c.finish('req',null);
 let read=await readState(c.dir);assert.equal(read.state.outcome.goal,'in-progress');assert.equal(read.session.action,'arrange-next');assert.match(read.session.instruction,/next authorized work/);assert.ok(read.session.continuation.includes(c.dir));
 for(const command of ['read','check','resume']) {
  const result=spawnSync(process.execPath,[path.join(root,'bin/aimship.mjs'),command,c.dir,'--rules-version',version],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);
  const data=JSON.parse(result.stdout).data;assert.equal(data.session.action,'arrange-next');assert.notEqual(data.session.continuation,null);
 }
 await c.save({currentRun:null});assert.equal((await readState(c.dir)).session.action,'arrange-next');
 await c.save({outcome:{goal:'met',goalConclusionRef:'prd.md'}});read=await readState(c.dir);assert.equal(read.session.action,'finished');assert.equal(read.completion.status,'partial-scope');assert.equal(read.completion.standardComplete,false);
});

test('a later failed review reopens session advice after a recorded standard completion',async t=>{
 const c=await setup(t);for(const [id] of definitions)await c.finish(id);
 await c.save({outcome:{goal:'met',goalConclusionRef:'handoff.md',acceptance:'accepted',acceptanceRef:'source/limited.md'}});
 assert.equal((await readState(c.dir)).completion.standardComplete,true);
 const priorRuns=structuredClone(c.state.stageRuns);
 const later={id:'later-failed-review',stage:'review',scope:'Review a reopened regression',progress:'done',result:'failed',resultRef:'review.md#independent',inputRefs:[],outputRefs:['review.md'],reviewOf:['imp1','imp2'],overall:true};
 const result=spawnSync(process.execPath,[path.join(root,'bin/aimship.mjs'),'update',c.dir,'--revision',String(c.state.revision),'--rules-version',version,'--input','-'],{input:JSON.stringify({stageRuns:[...priorRuns,later],currentRun:later.id}),encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);
 const read=await readState(c.dir);
 assert.deepEqual(read.state.stageRuns.slice(0,-1),priorRuns,'completed historical stages remain unchanged');
 assert.equal(read.state.outcome.goal,'met','the historical goal conclusion is not rewritten by advice');
 assert.equal(read.completion.standardComplete,false);assert.equal(read.review.canProceed,false);
 assert.equal(read.session.action,'resolve-current');assert.ok(read.session.continuation);
});

test('an explicitly limited independent review can conclude with failed findings',async t=>{
 const c=await setup(t,{selected:[definitions[0],['independent','review','review']],partial:true});
 await c.finish('req');await c.finish('independent','failed');
 await c.save({outcome:{goal:'met',goalConclusionRef:'review.md#independent'}});
 const read=await readState(c.dir);
 assert.equal(read.completion.status,'partial-scope');assert.equal(read.completion.standardComplete,false);
 assert.equal(read.review.runs.find(r=>r.id==='independent').releaseReady,false);
 assert.equal(read.session.action,'finished');assert.equal(read.session.continuation,null);
});
