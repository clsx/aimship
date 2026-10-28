import { documentFixture } from '../scripts/testing/documents.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { initState, updateState, readState, renderState } from '../lib/state.mjs';
import { run } from '../lib/cli.mjs';
import { approveFixture } from '../scripts/testing/reviews.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
const runtime={version,activeVersion:version,dataRoot:await fs.realpath(os.tmpdir())};
const reg=kind=>({kind,path:`${kind}.md`,mode:'new',version:'1'});
const stage=(stage,progress='active',extra={})=>({id:stage,stage,scope:'Synthetic order export',progress,inputRefs:[],outputRefs:[],...extra});
const input=()=>({language:'en',goal:{summary:'Export the currently filtered orders'},stageRuns:[stage('requirements')],currentRun:'requirements',next:{action:'Clarify export columns',inputRefs:['source/request.md']}});
const known={authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]};
async function setup(t) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-init-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));await fs.writeFile(path.join(dir,'source/request.md'),'User request (synthetic): Export the currently filtered orders. Code and final endpoint are not decided. Synthetic user choice: use this isolated temporary delivery directory.');
 return dir;
}
async function doc(dir,kind) {await fs.writeFile(path.join(dir,`${kind}.md`),await documentFixture(kind));}
async function inspect(command,dir) {return (await run([command,dir,'--rules-version',version],{sourceRoot:root})).data;}
function cli(command,dir,value,revision) {
 if(command==='init') value={...value,storage:{mode:'explicit',decisionRef:'source/request.md'}};
 const result=spawnSync(process.execPath,[path.join(root,'bin/aimship.mjs'),command,dir,'--rules-version',version,...(value?['--input','-']:[]),...(revision===undefined?[]:['--revision',String(revision)])],{input:value?JSON.stringify(value):undefined,encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout).data;
}
test('initialization: real CLI saves request without PRD/code/conditions; fresh CLI resumes same identity',async t=>{
 const dir=await setup(t),request=await fs.readFile(path.join(dir,'source/request.md'));
 const state=cli('init',dir,input());assert.equal(state.schemaVersion,4);assert.equal(state.goal.endpoint,null);assert.equal(state.goalRef,'source/request.md');assert.deepEqual(state.repositories,[]);assert.deepEqual(state.documents,[]);
 for(const value of Object.values(state.documentPolicy))assert.equal(value,null);
 const receipt=state.writeResult.receipt;assert.equal(receipt.status,'saved');assert.equal(receipt.directory,dir);assert.equal(receipt.currentStage,'requirements');assert.equal(receipt.nextAction,'Clarify export columns');assert.equal(receipt.deliveryId,state.deliveryId);
 await assert.rejects(fs.access(path.join(dir,'prd.md')));assert.match(await fs.readFile(receipt.statusPath,'utf8'),/unknown/);
 const before=await fs.readFile(path.join(dir,'.aimship/state.json'));
 for(const command of ['read','check','resume']) {const out=cli(command,dir);if(command==='resume'){assert.equal(out.canProceed,true);assert.equal(out.state.deliveryId,state.deliveryId);}}
 assert.deepEqual(await fs.readFile(path.join(dir,'.aimship/state.json')),before);assert.deepEqual(await fs.readFile(path.join(dir,'source/request.md')),request);
});
test('initialization: draft, pending review, approval, design and code association preserve one delivery',async t=>{
 const dir=await setup(t);let state=await initState(dir,input(),version,runtime);const id=state.deliveryId;
 const save=async patch=>state=await updateState(dir,patch,state.revision,version,runtime);
 await doc(dir,'prd');await save({documents:[reg('prd')],documentPolicy:{authority:'authored'},goalRef:'prd.md',stageRuns:[stage('requirements','done',{outputRefs:['prd.md'],resultRef:'prd.md#requirements'})]});
 assert.equal(state.goalHistory,undefined);assert.equal((await inspect('resume',dir)).canProceed,false);
 await doc(dir,'tech-design');const docs=[reg('prd'),reg('tech-design')];
 await fs.writeFile(path.join(dir,'source/endpoint.md'),'Synthetic explicit scope decision: design handoff only.');
 await save({goal:{endpoint:'Design handoff',decisionRef:'source/endpoint.md'},documents:docs});
 const advance={stageRuns:[...state.stageRuns,stage('tech-design')],currentRun:'tech-design'};
 await assert.rejects(save(advance),{code:'REVIEW_CHECK'});
 await save({reviewHistory:await approveFixture(dir,state,['prd.md'])});await save(advance);
 assert.equal((await inspect('resume',dir)).canProceed,true);assert.equal(state.documentPolicy.interface,null);
 const checkout=path.join(dir,'example-code');await fs.mkdir(checkout);await fs.writeFile(path.join(checkout,'module.js'),'export const value = 1;');const original=await fs.readFile(path.join(checkout,'module.js'));
 await save({repositories:[{id:'code',path:checkout,role:'Read-only requirement and design evidence; non-Git fixture'}],next:{action:'Read current module facts',inputRefs:['repo:code/module.js']}});
 assert.equal(state.deliveryId,id);assert.deepEqual(await fs.readFile(path.join(checkout,'module.js')),original);assert.equal((await inspect('check',dir)).references.some(r=>r.ref==='repo:code/module.js' && r.status==='exists'),true);
 const done={stageRuns:state.stageRuns.map(r=>r.stage==='tech-design'?{...r,progress:'done',resultRef:'tech-design.md#coverage',outputRefs:['tech-design.md']}:r)};
 await assert.rejects(save(done),{code:'DOCUMENT_CHECK'});await save({...done,documentPolicy:known});assert.equal(state.deliveryId,id);
});
test('initialization: missing stages or forged next/current pointers cannot bypass existing approvals',async t=>{
 for(const kind of ['prototype','tech-design','contract','test-design','plan','implement']) {
  const dir=await setup(t);await doc(dir,'prd');await doc(dir,'tech-design');await doc(dir,'testing');await doc(dir,'plan');await fs.mkdir(path.join(dir,'prototype'));await fs.writeFile(path.join(dir,'prototype/index.html'),'<p>synthetic</p>');await fs.writeFile(path.join(dir,'openapi.yaml'),'openapi: 3.1.0');
  const documents=['prd','tech-design','testing','plan'].map(reg).concat([{kind:'prototype',path:'prototype/index.html',mode:'new',version:'1'},{kind:'contract',path:'openapi.yaml',mode:'new',version:'1'}]);
  const base={language:'en',goal:{summary:'Synthetic request',endpoint:'Authorized design only'},goalRef:'prd.md',documentPolicy:known,documents};
  const runs=kind==='implement'?[stage('plan','done',{resultRef:'plan.md#tasks',outputRefs:['plan.md']}),stage(kind)]:[stage(kind)];
  await assert.rejects(initState(dir,{...base,stageRuns:runs,currentRun:kind},version,runtime),{code:'REVIEW_CHECK'});
  let state=await initState(dir,base,version,runtime);
  await assert.rejects(updateState(dir,{stageRuns:runs,currentRun:kind},state.revision,version,runtime),{code:'REVIEW_CHECK'});
  // A manually damaged record is also diagnosed by read/check/resume; no mutation on read.
  const file=path.join(dir,'.aimship/state.json');await fs.writeFile(file,JSON.stringify({...state,stageRuns:runs,currentRun:kind}));
  for(const command of ['read','check','resume']) {const report=await inspect(command,dir);assert.ok(report.review.runs.some(r=>r.blockedBy.some(x=>x.startsWith('approval:'))));if(command==='resume')assert.equal(report.canProceed,false);}
 }
});
test('initialization: source alone cannot complete requirements or goal; unknown endpoint is not limited authorization',async t=>{
 const dir=await setup(t);const state=await initState(dir,input(),version,runtime);
 await assert.rejects(updateState(dir,{stageRuns:[stage('requirements','done',{resultRef:'source/request.md',outputRefs:['source/request.md']})]},0,version,runtime),{code:'DOCUMENT_CHECK'});
 await assert.rejects(updateState(dir,{outcome:{goal:'met',goalConclusionRef:'source/request.md'}},0,version,runtime));
 await doc(dir,'prd');await doc(dir,'tech-design');const patch={goalRef:'prd.md',documentPolicy:{authority:'authored'},documents:[reg('prd'),reg('tech-design')],stageRuns:[stage('tech-design')],currentRun:'tech-design'};
 await assert.rejects(updateState(dir,patch,state.revision,version,runtime),{code:'DOCUMENT_CHECK'});
});
test('initialization: repeat, interrupted source-only save and competing writers preserve materials',async t=>{
 const dir=await setup(t),request=await fs.readFile(path.join(dir,'source/request.md'));
 await fs.mkdir(path.join(dir,'.aimship'));await fs.writeFile(path.join(dir,'.aimship/.state.lock'),'interrupted writer; inspect before removal');
 await assert.rejects(initState(dir,input(),version,runtime),{code:'LOCKED'});assert.deepEqual(await fs.readFile(path.join(dir,'source/request.md')),request);
 // This fixture owns the stopped writer and explicitly releases only its stale lock.
 await fs.rm(path.join(dir,'.aimship/.state.lock'));
 const outcomes=await Promise.allSettled([initState(dir,input(),version,runtime),initState(dir,input(),version,runtime)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const state=(await readState(dir)).state,before=await fs.readFile(path.join(dir,'.aimship/state.json'));
 await assert.rejects(initState(dir,input(),version,runtime),{code:'ALREADY_EXISTS'});assert.deepEqual(await fs.readFile(path.join(dir,'.aimship/state.json')),before);assert.deepEqual(await fs.readFile(path.join(dir,'source/request.md')),request);
 assert.equal(cli('resume',dir).state.deliveryId,state.deliveryId);
});
test('initialization: state saved with failed view repairs at same identity/revision without replay',async t=>{
 for(const failure of ['status','metadata']) {
  const dir=await setup(t);await fs.mkdir(path.join(dir,'.aimship'));
  const blocked=path.join(dir,failure==='status'?'status.md':'.aimship/view.json');await fs.mkdir(blocked);
  const state=await initState(dir,input(),version,runtime);assert.equal(state.writeResult.stateSaved,true);assert.notEqual(state.writeResult.view.status,'current');assert.equal(state.writeResult.receipt.statusPath,null);assert.equal(state.writeResult.receipt.status,'view-repair-required');
  assert.equal(cli('resume',dir).canProceed,false);await assert.rejects(initState(dir,input(),version,runtime),{code:'ALREADY_EXISTS'});
  await fs.rm(blocked,{recursive:true});await renderState(dir,0,version,runtime,true);const resumed=cli('resume',dir);assert.equal(resumed.canProceed,true);assert.equal(resumed.state.deliveryId,state.deliveryId);assert.equal(resumed.state.revision,0);
 }
});
test('initialization: existing manual view is retained, missing or empty request fails without overwriting it',async t=>{
 const dir=await setup(t);await fs.writeFile(path.join(dir,'status.md'),'Unrelated user notes');await fs.writeFile(path.join(dir,'source/request.md'),' ');
 await assert.rejects(initState(dir,input(),version,runtime),{code:'DOCUMENT_CHECK'});assert.equal(await fs.readFile(path.join(dir,'status.md'),'utf8'),'Unrelated user notes');
 await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic recovered original input');const state=await initState(dir,input(),version,runtime);assert.equal(state.writeResult.view.status,'protected');assert.equal(await fs.readFile(path.join(dir,'status.md'),'utf8'),'Unrelated user notes');
});
test('initialization: requirement-stage code reads are possible before draft or endpoint decisions',async t=>{
 const dir=await setup(t);let state=await initState(dir,input(),version,runtime);
 const code=path.join(dir,'existing-code');await fs.mkdir(code);await fs.writeFile(path.join(code,'behavior.txt'),'Observed current export behavior, synthetic fixture.');
 const bytes=await fs.readFile(path.join(code,'behavior.txt'));
 state=await updateState(dir,{repositories:[{id:'existing',path:code,role:'Read-only facts for requirement clarification'}],next:{action:'Read current export behavior before deciding requirements',inputRefs:['repo:existing/behavior.txt']}},0,version,runtime);
 const result=await inspect('resume',dir);assert.equal(result.canProceed,true);assert.equal(result.currentRun.stage,'requirements');assert.equal(state.goal.endpoint,null);assert.deepEqual(state.documents,[]);assert.deepEqual(await fs.readFile(path.join(code,'behavior.txt')),bytes);
});
test('initialization: non-applicable prototype coverage does not force an extra decision',async t=>{
 const dir=await setup(t);await doc(dir,'prd');await doc(dir,'tech-design');
 const init={language:'en',goal:{summary:'Synthetic noninteractive refactor',endpoint:'Design'},goalRef:'prd.md',documents:[reg('prd'),reg('tech-design')],documentPolicy:{...known,prototypeCovered:null},stageRuns:[stage('tech-design','done',{outputRefs:['tech-design.md'],resultRef:'tech-design.md#coverage'})],currentRun:'tech-design'};
 init.reviewHistory=await approveFixture(dir,init,['prd.md']);const state=await initState(dir,init,version,runtime);assert.equal(state.documentPolicy.prototypeCovered,null);assert.deepEqual((await inspect('check',dir)).documents.issues,[]);
});
test('initialization: a null currentRun cannot hide an active unapproved dependency',async t=>{
 const dir=await setup(t);await doc(dir,'prd');await doc(dir,'tech-design');let state=await initState(dir,{language:'en',goal:{summary:'Synthetic request',endpoint:'Design'},goalRef:'prd.md',documentPolicy:known,documents:[reg('prd'),reg('tech-design')]},version,runtime);
 await assert.rejects(updateState(dir,{stageRuns:[stage('tech-design')],currentRun:null},0,version,runtime),{code:'REVIEW_CHECK'});
 state={...state,stageRuns:[stage('tech-design')],currentRun:null};delete state.writeResult;await fs.writeFile(path.join(dir,'.aimship/state.json'),JSON.stringify(state));
 assert.equal((await inspect('resume',dir)).canProceed,false);assert.equal((await inspect('check',dir)).review.canProceed,false);
});
