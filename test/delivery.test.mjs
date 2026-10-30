import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {initState,updateState,readState,renderState,recoverState,checkReferences} from '../lib/state.mjs';
import {completionStatus,sessionAdvice} from '../lib/delivery.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
import {run} from '../lib/cli.mjs';
import {spawnSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version,runtime={version,activeVersion:version,dataRoot:await fs.realpath(os.tmpdir())};
const stages=[['requirements','prd'],['tech-design','tech-design'],['test-design','testing'],['plan','plan'],['implement','plan'],['review','review'],['review','review'],['verify','testing'],['handoff','handoff']];
async function setup(t,{partial=false,omitTests=false}={}) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-delivery-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'source'));
 await fs.mkdir(path.join(dir,'.aimship'),{recursive:true});await fs.writeFile(path.join(dir,'.aimship/init.md'),'Synthetic commission only.');await fs.writeFile(path.join(dir,'source/decision.md'),'Synthetic explicit choice: development and review only, no cases or execution; untested partial handoff.');
 const docs=[...new Set(stages.map(x=>x[1]))].filter(k=>!omitTests || k!=='testing').map(kind=>({kind,path:`${kind}.md`,version:'adopted-1',mode:'reused',basisRef:'.aimship/init.md'}));
 for(const d of docs)await fs.writeFile(path.join(dir,d.path),`# Synthetic adopted ${d.kind}\nFixed source and scope; inspect before reuse.\n`);
 const runs=stages.map(([stage,kind],i)=>({id:`r${i}`,stage,scope:`synthetic ${stage}`,progress:'planned',inputRefs:[],outputRefs:[`${kind}.md`],...(stage==='review'?{reviewOf:['r4'],overall:i===6}:{})})).filter(r=>!omitTests || !['test-design','verify'].includes(r.stage));
 let state=await initState(dir,{language:'en',deliveryPolicy:{version:1,...(partial?{partialRef:'source/decision.md'}:{})},goal:{summary:'Synthetic delivery',endpoint:partial?'Untested development and review handoff':'Standard complete delivery'},goalRef:'prd.md',documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:docs,stageRuns:runs,currentRun:runs[0].id},version,runtime);
 const save=async patch=>state=await updateState(dir,patch,state.revision,version,runtime);
 const finish=async id=>{
  const r=state.stageRuns.find(x=>x.id===id);await save({stageRuns:state.stageRuns.map(x=>x.id===id?{...x,progress:'done',result:'passed',resultRef:x.outputRefs[0]}:x),currentRun:id,next:{action:`After ${id}, follow actual saved work.`}});
  if(['requirements','tech-design','test-design','plan'].includes(r.stage))await save({reviewHistory:await approveFixture(dir,state,r.outputRefs)});
 };
 return {dir,save,finish,get state(){return state}};
}
test('standard delivery requires actual complete stages, batch/overall review, passing verification and separate acceptance',async t=>{
 const c=await setup(t);assert.equal((await readState(c.dir)).completion.standardComplete,false);
 for(const r of c.state.stageRuns)await c.finish(r.id);
 let report=(await readState(c.dir)).completion;assert.deepEqual(report.gaps,[]);assert.equal(report.readyForAcceptance,true);assert.equal(report.standardComplete,false);
 await c.save({outcome:{goal:'met',goalConclusionRef:'handoff.md'}});assert.equal((await readState(c.dir)).completion.standardComplete,false);
 await c.save({outcome:{acceptance:'accepted',acceptanceRef:'source/decision.md'}});assert.equal((await readState(c.dir)).completion.standardComplete,true);
 const damaged=structuredClone(c.state);damaged.stageRuns.find(r=>r.stage==='verify').result='not-run';assert.equal(completionStatus(damaged,(await readState(c.dir)).review).standardComplete,false);
 for(const mutate of [s=>s.stageRuns.find(r=>r.overall).overall=false,s=>{for(const r of s.stageRuns.filter(r=>r.stage==='review'))r.reviewOf=[];},s=>s.documentPolicy.databases.push('main'),s=>s.stageRuns.find(r=>r.stage==='implement').result='failed']) {const s=structuredClone(c.state);mutate(s);assert.equal(completionStatus(s,(await readState(c.dir)).review).standardComplete,false);}
});
test('explicit no-tests scope can finish and be accepted without masquerading as standard completion',async t=>{
 for(const partial of [false,true]){
  const c=await setup(t,{partial,omitTests:true});
  for(const r of c.state.stageRuns) {
   if(!partial && r.stage==='plan') {await assert.rejects(c.finish(r.id),{code:'REVIEW_CHECK'});break;}
   await c.finish(r.id);
  }
  const patch={outcome:{goal:'met',goalConclusionRef:'handoff.md',acceptance:'accepted',acceptanceRef:'source/decision.md'}};
  if(!partial)await assert.rejects(c.save(patch),{code:'REVIEW_CHECK'});
  else {await c.save(patch);const read=await readState(c.dir);assert.equal(read.completion.status,'partial-scope');assert.equal(read.completion.standardComplete,false);assert.ok(read.completion.gaps.some(g=>g.includes('verify')));assert.ok(!(await fs.readdir(c.dir)).includes('testing.md'));}
 }
});
test('adopted materials are not approval; waiting, editing, stage continuation and advisory boundary remain separate',async t=>{
 const c=await setup(t);const before=await readState(c.dir);assert.equal(before.review.documents[0].approval,null);
 const r=c.state.stageRuns[0];await c.save({stageRuns:c.state.stageRuns.map(x=>x.id===r.id?{...x,progress:'done',resultRef:'prd.md'}:x)});
 assert.equal((await readState(c.dir)).session.action,'await-review');assert.equal((await readState(c.dir)).session.continuation,null);
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,['prd.md'])});let read=await readState(c.dir);assert.equal(read.session.action,'await-continue');assert.equal(read.review.canProceed,true);
 // Continuing here is a normal authorized stage update, no new approval or session ID.
 await c.save({stageRuns:c.state.stageRuns.map(x=>x.id==='r1'?{...x,progress:'active'}:x),currentRun:'r1'});assert.equal((await readState(c.dir)).session.action,'continue-current');
 await c.finish('r1');await c.save({stageRuns:c.state.stageRuns.map(x=>x.id==='r2'?{...x,sessionGroup:'technical'}:x)});assert.equal((await readState(c.dir)).session.action,'await-continue');
 const h=c.state.reviewHistory;await c.save({reviewHistory:[...h,{...h.at(-1),id:'edit',kind:'changes-requested'}]});assert.equal((await readState(c.dir)).session.action,'await-review');
});
test('session suggestions are saved and displayed; overall review and test batches have separate groups; failure does not advance',async t=>{
 const c=await setup(t);assert.equal(c.state.stageRuns[4].sessionGroup,c.state.stageRuns[5].sessionGroup);assert.notEqual(c.state.stageRuns[5].sessionGroup,c.state.stageRuns[6].sessionGroup);
 assert.match(await fs.readFile(path.join(c.dir,'status.md'),'utf8'),/Continue this delivery/);
 for(const r of c.state.stageRuns)await c.finish(r.id);
 assert.equal((await readState(c.dir)).session.continuation,null);
 const s=structuredClone(c.state);s.currentRun='r7';s.stageRuns[7].result='failed';assert.equal(sessionAdvice(c.dir,s,(await readState(c.dir)).review).action,'resolve-current');
});
test('save conflict or protected view never emits a successful handoff; repair does not repeat approval',async t=>{
 const c=await setup(t);await assert.rejects(updateState(c.dir,{next:{action:'bad'}},99,version,runtime),{code:'REVISION_CONFLICT'});assert.equal((await readState(c.dir)).state.revision,0);
 await c.finish('r0');
 const blocked=structuredClone((await readState(c.dir)).review);blocked.runs[1].blockedBy=['unresolved-dependency'];
 assert.equal(sessionAdvice(c.dir,c.state,blocked,{saved:false}).continuation,null);
 await fs.appendFile(path.join(c.dir,'status.md'),'manual note');const saved=await c.save({next:{action:'actual saved next'}});assert.equal(saved.writeResult.stateSaved,true);assert.equal(saved.writeResult.session.action,'reconcile-save');assert.equal(saved.writeResult.session.continuation,null);
 assert.equal((await readState(c.dir)).session.continuation,null);const history=c.state.reviewHistory;
 await renderState(c.dir,c.state.revision,version,runtime,true);assert.deepEqual((await readState(c.dir)).state.reviewHistory,history);
});
test('restoring standard scope retains the partial decision and cannot hide omitted testing',async t=>{
 const c=await setup(t,{partial:true,omitTests:true});
 for(const r of c.state.stageRuns)await c.finish(r.id);
 await assert.rejects(c.save({deliveryPolicy:{version:1,partialRef:null}}),{code:'INVALID_STATE'});
 await c.save({deliveryPolicy:{version:1,partialRef:null},goal:{endpoint:'Standard complete delivery',decisionRef:'.aimship/init.md'}});
 assert.equal(c.state.goalHistory.at(-1).deliveryPolicy.partialRef,'source/decision.md');
 assert.ok((await checkReferences(c.dir,c.state,true)).every(r=>['exists','not-checked'].includes(r.status)));
 assert.equal((await readState(c.dir)).completion.standardComplete,false);
 await assert.rejects(c.save({outcome:{goal:'met',goalConclusionRef:'handoff.md'}}),{code:'REVIEW_CHECK'});
});
test('resume requires explicit directory; old prompt is not an approval and new session retains actual pending content',async t=>{
 const c=await setup(t);await c.finish('r0');const prompt=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data.continuation;assert.ok(prompt.includes(JSON.stringify(c.dir)));
 await fs.appendFile(path.join(c.dir,'prd.md'),'changed after prompt');const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;assert.equal(resumed.canProceed,false);assert.equal(resumed.continuation,null);
 await assert.rejects(run(['resume',c.dir,'--delivery-id','wrong-id'],{sourceRoot:root}),{code:'DELIVERY_ID_MISMATCH'});
 await assert.rejects(run(['resume'],{sourceRoot:root}),{code:'USAGE'});await assert.rejects(run(['resume',path.join(c.dir,'wrong')],{sourceRoot:root}));
});
test('later failing review invalidates completeness until explicitly resolved and reverified',async t=>{
 const c=await setup(t);for(const r of c.state.stageRuns)await c.finish(r.id);
 await c.save({outcome:{goal:'met',goalConclusionRef:'handoff.md',acceptance:'accepted',acceptanceRef:'source/decision.md'}});
 await fs.appendFile(path.join(c.dir,'review.md'),'\n## late-review\nSynthetic later review: unresolved defect.\n## review-fix\nSynthetic repair review superseding the later finding.\n');
 const late={id:'late-review',stage:'review',scope:'later overall review finding',reviewOf:['r4'],overall:true,progress:'done',result:'failed',inputRefs:[],outputRefs:['review.md'],resultRef:'review.md#late-review'};
 await c.save({stageRuns:[...c.state.stageRuns,late],currentRun:late.id});
 let read=await readState(c.dir);assert.equal(read.completion.standardComplete,false);assert.ok(read.completion.gaps.includes('Review results remain unresolved.'));
 const repaired={...late,id:'repaired-review',result:'passed',resultRef:'review.md#review-fix',historyResultRefs:[late.resultRef]};
 await c.save({stageRuns:[...c.state.stageRuns,repaired],currentRun:repaired.id});
 read=await readState(c.dir);assert.equal(read.completion.standardComplete,false);assert.ok(!read.completion.gaps.includes('Review results remain unresolved.'));assert.ok(read.completion.gaps.some(g=>g.includes('after overall review')));
});
test('real CLI preserves waiting, boundary, continue-here and save-failure session outputs',async t=>{
 const c=await setup(t);let state=c.state;
 const cli=(command,patch)=>{
  const args=[path.join(root,'bin/aimship.mjs'),command,c.dir,'--rules-version',version,...(patch?['--revision',String(state.revision),'--input','-']:[])];
  const result=spawnSync(process.execPath,args,{input:patch?JSON.stringify(patch):undefined,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);const data=JSON.parse(result.stdout).data;if(patch)state=data;return data;
 };
 cli('update',{stageRuns:state.stageRuns.map(r=>r.id==='r0'?{...r,progress:'done',resultRef:'prd.md'}:r)});
 let data=cli('resume');assert.equal(data.canProceed,false);assert.equal(data.session.action,'await-review');assert.equal(data.continuation,null);
 data=cli('update',{reviewHistory:await approveFixture(c.dir,state,['prd.md'])});assert.equal(data.writeResult.stateSaved,true);assert.equal(data.writeResult.view.status,'current');assert.equal(data.writeResult.session.action,'await-continue');
 data=cli('resume');assert.equal(data.canProceed,true);assert.equal(data.session.action,'await-continue');assert.ok(data.continuation.includes(JSON.stringify(c.dir)));
 const approved=state.reviewHistory;cli('update',{stageRuns:state.stageRuns.map(r=>r.id==='r1'?{...r,progress:'active'}:r),currentRun:'r1'});
 data=cli('resume');assert.equal(data.session.action,'continue-current');assert.deepEqual(data.state.reviewHistory,approved);
 await fs.appendFile(path.join(c.dir,'status.md'),'unmanaged manual note');
 data=cli('update',{next:{action:'Saved real next action'}});assert.equal(data.writeResult.stateSaved,true);assert.equal(data.writeResult.view.status,'protected');assert.equal(data.writeResult.session.continuation,null);
 data=cli('resume');assert.equal(data.canProceed,false);assert.equal(data.session.action,'reconcile-save');assert.equal(data.continuation,null);
});

test('interaction delivery may complete without a selected prototype; non-review stage saves stop without extra approval',async t=>{
 const c=await setup(t);await c.save({documentPolicy:{interaction:true,prototypeCovered:false}});
 for(const r of c.state.stageRuns){
  const count=c.state.reviewHistory.length;await c.finish(r.id);
  if(['implement','review','verify'].includes(r.stage)){
   assert.equal(c.state.reviewHistory.length,count);
   const read=await readState(c.dir);assert.equal(read.session.action,'await-continue');assert.equal(read.session.stop,true);assert.equal(read.session.suggestNewSession,r.stage==='review');
  }
 }
 assert.equal((await readState(c.dir)).completion.readyForAcceptance,true);
});

test('a selected prototype still needs completion and its existing approval before dependent work',async t=>{
 const c=await setup(t);
 await fs.writeFile(path.join(c.dir,'prototype.md'),'# Prototype\nSelected account interaction and error states.');
 const prototype={id:'prototype',stage:'prototype',scope:'Selected interaction design',progress:'planned',inputRefs:['prd.md'],outputRefs:['prototype.md']};
 await c.save({documentPolicy:{interaction:true,prototypeCovered:false},documents:[...c.state.documents,{kind:'prototype',path:'prototype.md',mode:'reused',version:'1',basisRef:'.aimship/init.md'}],stageRuns:[c.state.stageRuns[0],prototype,...c.state.stageRuns.slice(1)]});
 await c.finish('r0');await assert.rejects(c.finish('r1'),{code:'REVIEW_CHECK'});
 await c.save({stageRuns:c.state.stageRuns.map(r=>r.id===prototype.id?{...r,progress:'done',resultRef:'prototype.md'}:r),currentRun:prototype.id});
 await assert.rejects(c.finish('r1'),{code:'REVIEW_CHECK'});
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,['prototype.md'])});await c.finish('r1');
});
