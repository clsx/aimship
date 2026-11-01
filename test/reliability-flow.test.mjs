import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {spawnSync} from 'node:child_process';
import {initState,updateState,readState} from '../lib/state.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
import {renderText} from '../lib/view.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
const definitions=[['req','requirements','prd'],['design','tech-design','tech-design'],['cases','test-design','testing'],['plan','plan','plan'],['imp1','implement','plan'],['rev1','review','review'],['imp2','implement','plan'],['rev2','review','review'],['overall','review','review'],['verify','verify','testing'],['handoff','handoff','handoff']];
async function setup(t,{selected=definitions,partial=false}={}) {
 const dataRoot=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-reliability-flow-'))),dir=path.join(dataRoot,'delivery');
 t.after(()=>fs.rm(dataRoot,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'source'),{recursive:true});
 await fs.mkdir(path.join(dir,'.aimship'),{recursive:true});await fs.writeFile(path.join(dir,'.aimship/init.md'),'Synthetic fixture request only; no actual business work or approval.');
 await fs.writeFile(path.join(dir,'source/limited.md'),'Synthetic explicitly limited commission, not standard complete delivery.');
 const docs=[...new Set(selected.map(x=>x[2]))].map(kind=>({kind,path:`${kind}.md`,mode:'reused',version:'synthetic-1',basisRef:'.aimship/init.md'}));
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
  const view=await renderText(c.dir,c.state);
  if(['failed','mixed'].includes(result))assert.match(view,/recorded unsuccessful result/);
  else {
   assert.doesNotMatch(view,/recorded unsuccessful result|Result needs resolution/);
   assert.match(view,result==='unknown'?/Result not yet known/:result==='not-run'?/Not run/:/Review result not recorded/);
   const chinese=await renderText(c.dir,{...c.state,language:'zh-CN'});
   assert.doesNotMatch(chinese,/未通过|结果待处理/);assert.match(chinese,result==='unknown'?/结果尚未确定/:result==='not-run'?/未执行/:/审查结果未记录/);
  }
  const before=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
  await assert.rejects(c.start('imp2'),{code:'REVIEW_CHECK'});
  assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),before,'rejected advancement does not save state');
  await c.save({currentRun:null});assert.equal((await readState(c.dir)).review.canProceed,false);
 }
});

test('progress keeps main stages stable across batches and distinguishes the overall review',async t=>{
 const c=await setup(t);
 const table=view=>view.split('## Delivery progress')[1].split('Delivery conclusion:')[0];
 const rows=view=>table(view).split('\n').filter(l=>/^\| [a-zA-Z]/.test(l)).map(l=>l.split('|')[1].trim());
 const expected=['Stage','requirements','tech-design','test-design','plan','implement','Overall review','verify','handoff'];
 assert.deepEqual(rows(await renderText(c.dir,c.state)),expected);
 for(const id of ['req','design','cases','plan','imp1','rev1','imp2','rev2'])await c.finish(id);
 let view=await renderText(c.dir,c.state);
 assert.deepEqual(rows(view),expected);assert.match(view,/Current stage: implement · Batch review · Completed/);
 assert.match(table(view),/\| implement \| Recorded batches completed: 2; batch reviews passed \|/);
 assert.match(table(view),/\| Overall review \| Not started \|/);
 assert.doesNotMatch(table(view),/Synthetic|rev1|rev2|imp1|imp2/);
 // Absence of a future run does not erase its standard main stage.
 await c.save({stageRuns:c.state.stageRuns.filter(r=>r.progress!=='planned')});
 view=await renderText(c.dir,c.state);assert.deepEqual(rows(view),expected);assert.match(view,/After this stop: Overall review/);
 const overall={id:'overall',stage:'review',scope:'Actual combined review',reviewOf:['imp1','imp2'],overall:true,progress:'planned',inputRefs:[],outputRefs:['review.md']};
 await c.save({stageRuns:[...c.state.stageRuns,overall]});await c.finish('overall','failed');
 assert.match(table(await renderText(c.dir,c.state)),/\| Overall review \| Result needs resolution \|/);
 const repair=correction(c,'overall');await c.save({stageRuns:[...c.state.stageRuns,repair],currentRun:repair.id});
 view=await renderText(c.dir,c.state);assert.deepEqual(rows(view),expected);assert.match(table(view),/\| Overall review \| Completed \|/);
 assert.match(table(view),/\| verify \| Not started \|/);
 assert.equal((await readState(c.dir)).completion.standardComplete,false);
 const later={id:'imp3',stage:'implement',scope:'Later authorized batch',progress:'done',result:'passed',resultRef:'plan.md',inputRefs:[],outputRefs:['plan.md']};
 const laterView=await renderText(c.dir,{...c.state,stageRuns:[...c.state.stageRuns,later],currentRun:'imp3'});
 assert.deepEqual(rows(laterView),expected);assert.match(table(laterView),/\| Overall review \| Review required for current batches \|/);
 assert.match(table(laterView),/batch review pending/);
});

test('progress links registered formal contracts without flattening internal evidence',async t=>{
 const c=await setup(t);await fs.mkdir(path.join(c.dir,'.aimship/evidence'));
 await fs.writeFile(path.join(c.dir,'rpc-contract.md'),'# RPC contract\nSynthetic methods and error behavior.');
 await fs.writeFile(path.join(c.dir,'.aimship/evidence/check.json'),'{}');
 await c.save({documents:[...c.state.documents,{kind:'contract',path:'rpc-contract.md',mode:'new',version:'1'}],next:{action:'Prepare requirements',inputRefs:['rpc-contract.md','.aimship/evidence/check.json']},stageRuns:c.state.stageRuns.map(r=>r.id==='req'?{...r,outputRefs:[...r.outputRefs,'.aimship/evidence/check.json']}:r)});
 const view=await renderText(c.dir,c.state);
 assert.equal(view.split('](rpc-contract.md)').length-1,1);assert.doesNotMatch(view,/Work material|check\.json/);
 await fs.writeFile(path.join(c.dir,'message.proto'),'syntax = "proto3";');
 const contract={id:'contract-extra',stage:'contract',scope:'Supplementary RPC/message formats',progress:'planned',inputRefs:[],outputRefs:['rpc-contract.md','message.proto','.aimship/evidence/check.json']};
 const extraView=await renderText(c.dir,{...c.state,documents:c.state.documents.filter(d=>d.path!=='rpc-contract.md'),stageRuns:[...c.state.stageRuns,contract]});
 assert.equal(extraView.split('](rpc-contract.md)').length-1,1);assert.match(extraView,/Additional contract: \[message\.proto\]/);assert.doesNotMatch(extraView,/check\.json/);
});

test('a question with an unknown result is shown as clarification without reporting failure',async t=>{
 const c=await setup(t);await c.finish('req');
 await fs.writeFile(path.join(c.dir,'source/question.md'),'# Scope question\nChoose the export columns before completing design.');
 await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='design'?{...r,progress:'blocked',result:'unknown'}:r),currentRun:'design',next:{action:'Choose export columns',questionRef:'source/question.md'}});
 const view=await renderText(c.dir,c.state);assert.match(view,/Awaiting clarification/);assert.doesNotMatch(view,/unsuccessful|failed|Result needs resolution/);
 assert.equal((await readState(c.dir)).review.canProceed,false);
});

test('limited standalone review does not invent implementation or standard future phases',async t=>{
 const c=await setup(t,{selected:[['req','requirements','prd'],['independent','review','review']],partial:true});
 await c.finish('req');await c.finish('independent');
 const view=await renderText(c.dir,c.state),table=view.split('## Delivery progress')[1].split('Delivery conclusion:')[0];
 assert.match(table,/\| review \| Completed \|/);assert.doesNotMatch(table,/implement|Overall review|verify|handoff/);
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
 let read=await readState(c.dir);assert.equal(read.state.outcome.goal,'in-progress');assert.equal(read.session.action,'await-continue');assert.match(read.session.instruction,/Say “continue” when ready/);
 const quotedDirectory=read.session.continuation.match(/delivery ("(?:[^"\\]|\\.)*")/);
 assert.ok(quotedDirectory,'Continuation identifies the delivery directory');assert.equal(JSON.parse(quotedDirectory[1]),c.dir,'Decode the quoted path on Windows as well as POSIX');
 for(const command of ['read','check','resume']) {
  const result=spawnSync(process.execPath,[path.join(root,'bin/aimship.mjs'),command,c.dir,'--rules-version',version],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);
  const data=JSON.parse(result.stdout).data;assert.equal(data.session.action,'await-continue');assert.notEqual(data.session.continuation,null);
 }
 await c.save({currentRun:null});assert.equal((await readState(c.dir)).session.action,'await-continue');
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
