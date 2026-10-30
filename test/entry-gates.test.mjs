import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {approveFixture} from '../scripts/testing/reviews.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
const sequence=[['req','requirements','prd'],['design','tech-design','tech-design'],['cases','test-design','testing'],['plan','plan','plan'],['impl','implement','plan'],['overall','review','review'],['verify','verify','testing'],['handoff','handoff','handoff']];
async function fixture(t,{partial=false,partialRef='source/limited.md',selected=sequence}={}) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-entry-gate-')));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));
 await fs.mkdir(path.join(dir,'.aimship'),{recursive:true});await fs.writeFile(path.join(dir,'.aimship/init.md'),'Synthetic commission and explicit choice of this temporary delivery location.');
 await fs.writeFile(path.join(dir,'source/limited.md'),'Synthetic explicit commission: only the listed independent work and limited handoff. Not a real user approval.');
 const documents=[...new Set(['prd',...selected.map(x=>x[2])])].map(kind=>({kind,path:`${kind}.md`,mode:'reused',version:'fixture-1',basisRef:'.aimship/init.md'}));
 for(const doc of documents) await fs.writeFile(path.join(dir,doc.path),`# Synthetic ${doc.kind}\n## repair\nEvidence for a synthetic repair.\n`);
 const stageRuns=selected.map(([id,stage,kind])=>({id,stage,scope:`Synthetic ${id}`,progress:'planned',inputRefs:[],outputRefs:[`${kind}.md`],dependsOn:[],...(stage==='review' && id==='overall' && selected.some(r=>r[0]==='impl')?{reviewOf:['impl'],overall:true}:{})}));
 let state;
 const invoke=(command,input)=>{
  const args=[path.join(root,'bin/aimship.mjs'),command,dir,'--rules-version',version,...(input===undefined?[]:['--input','-']),...(command==='update'?['--revision',String(state.revision)]:[])];
  const result=spawnSync(process.execPath,args,{input:input===undefined?undefined:JSON.stringify(input),encoding:'utf8',timeout:15000});
  const response=JSON.parse(result.status===0?result.stdout:result.stderr);
  if(result.status===0 && ['init','update'].includes(command))state=response.data;
  return {status:result.status,...response};
 };
 const start=invoke('init',{language:'en',goal:{summary:'Synthetic entry gate test',endpoint:'Recorded synthetic endpoint'},goalRef:'prd.md',storage:{mode:'explicit',decisionRef:'.aimship/init.md'},deliveryPolicy:{version:1,...(partial?{partialRef}:{})},documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents,stageRuns,currentRun:stageRuns[0]?.id??null});
 assert.equal(start.status,0,JSON.stringify(start));
 const save=patch=>invoke('update',patch);
 const finish=async(id,result='passed')=>{
  const r=state.stageRuns.find(r=>r.id===id);
  const response=save({stageRuns:state.stageRuns.map(r=>r.id===id?{...r,progress:'done',result,resultRef:r.outputRefs[0]}:r),currentRun:id});
  assert.equal(response.status,0,JSON.stringify(response));
  if(['requirements','tech-design','test-design','plan'].includes(r.stage)) {
   const approved=save({reviewHistory:await approveFixture(dir,state,r.outputRefs)});assert.equal(approved.status,0,JSON.stringify(approved));
  }
 };
 const activate=id=>save({stageRuns:state.stageRuns.map(r=>r.id===id?{...r,progress:'active'}:r),currentRun:id});
 return {dir,invoke,save,finish,activate,get state(){return state}};
}
async function rejectedWithoutSave(c,response) {
 assert.equal(response.status,1,JSON.stringify(response));assert.equal(response.error.code,'REVIEW_CHECK');
 assert.equal(JSON.parse(await fs.readFile(path.join(c.dir,'.aimship/state.json'))).revision,c.state.revision);
}

test('standard CLI entry rejects review/verify/handoff with empty dependencies while predecessors are planned',async t=>{
 const c=await fixture(t),before=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 for(const id of ['overall','verify','handoff']) {
  await rejectedWithoutSave(c,c.activate(id));
  assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),before);
 }
});

test('standard CLI entry accepts the complete approved path even when explicit dependencies are empty',async t=>{
 const c=await fixture(t);
 for(const [id] of sequence)await c.finish(id);
 assert.equal(c.invoke('resume').data.completion.readyForAcceptance,true);
 const response=c.save({outcome:{goal:'met',goalConclusionRef:'handoff.md',acceptance:'accepted',acceptanceRef:'source/limited.md'}});
 assert.equal(response.status,0,JSON.stringify(response));assert.equal(c.invoke('resume').data.completion.standardComplete,true);
});

test('standard entry rejects omitted coverage/stages and cannot infer standalone work from empty dependencies',async t=>{
 for(const stage of ['review','verify','handoff']) {
  const row=sequence.find(r=>r[1]===stage),selected=[sequence[0],[row[0],row[1],row[2]]];
  const c=await fixture(t,{selected});
  if(stage==='review') {const response=c.save({stageRuns:c.state.stageRuns.map(r=>{const copy={...r};delete copy.reviewOf;delete copy.overall;return copy;})});assert.equal(response.status,0,JSON.stringify(response));}
  await rejectedWithoutSave(c,c.activate(row[0]));
 }
});

test('standard review entry blocks failed implementation and invalidated upstream approval, while drafts remain saveable',async t=>{
 const c=await fixture(t);for(const id of ['req','design','cases','plan'])await c.finish(id);
 for(const result of ['failed','mixed','unknown','not-run']) {
  await c.finish('impl',result);await rejectedWithoutSave(c,c.activate('overall'));
 }
 await c.finish('impl');
 const approval=c.state.reviewHistory.find(r=>r.kind==='approved' && r.document==='prd.md');
 const saved=c.save({reviewHistory:[...c.state.reviewHistory,{...approval,id:'request-revision',kind:'changes-requested',summary:'Synthetic request to revise current requirements.'}]});
 assert.equal(saved.status,0,JSON.stringify(saved));
 await rejectedWithoutSave(c,c.activate('overall'));
 assert.equal(c.state.stageRuns.find(r=>r.id==='overall').progress,'planned');
 const edited=c.save({next:{action:'Revise the draft and seek approval'}});assert.equal(edited.status,0,JSON.stringify(edited));
});

test('standard verification rejects missing/nonpassing overall review even with completed implementation',async t=>{
 const c=await fixture(t);for(const id of ['req','design','cases','plan','impl'])await c.finish(id);
 await rejectedWithoutSave(c,c.activate('verify'));
 for(const result of ['failed','mixed','unknown','not-run']) {
  await c.finish('overall',result);await rejectedWithoutSave(c,c.activate('verify'));
 }
 const omitted=await fixture(t,{selected:sequence.filter(r=>r[0]!=='overall')});for(const id of ['req','design','cases','plan','impl'])await omitted.finish(id);
 await rejectedWithoutSave(omitted,omitted.activate('verify'));
});

test('standard handoff blocks failed verification and permits an evidenced passing rerun',async t=>{
 const c=await fixture(t);for(const id of ['req','design','cases','plan','impl','overall'])await c.finish(id);
 for(const result of ['failed','mixed','unknown','not-run']) {
  await c.finish('verify',result);await rejectedWithoutSave(c,c.activate('handoff'));
 }
 const previous=c.state.stageRuns.find(r=>r.id==='verify'),repair={...previous,id:'rerun',progress:'done',result:'passed',resultRef:'testing.md#repair',historyResultRefs:[previous.resultRef]};
 const saved=c.save({stageRuns:c.state.stageRuns.flatMap(r=>r.id==='verify'?[r,repair]:[r]),currentRun:repair.id});assert.equal(saved.status,0,JSON.stringify(saved));
 await c.finish('handoff');assert.equal(c.invoke('resume').data.completion.readyForAcceptance,true);
});

test('standard handoff cannot skip a later failed review or reuse verification from before its passing repair',async t=>{
 const c=await fixture(t);for(const id of ['req','design','cases','plan','impl','overall','verify'])await c.finish(id);
 const late={...c.state.stageRuns.find(r=>r.id==='overall'),id:'late',result:'failed',resultRef:'review.md#repair'};
 let response=c.save({stageRuns:c.state.stageRuns.flatMap(r=>r.id==='handoff'?[late,r]:[r]),currentRun:late.id});assert.equal(response.status,0,JSON.stringify(response));
 await rejectedWithoutSave(c,c.activate('handoff'));
 const repair={...late,id:'review-repair',result:'passed',resultRef:'review.md',historyResultRefs:[late.resultRef]};
 response=c.save({stageRuns:c.state.stageRuns.flatMap(r=>r.id==='handoff'?[repair,r]:[r]),currentRun:repair.id});assert.equal(response.status,0,JSON.stringify(response));
 await rejectedWithoutSave(c,c.activate('handoff'));
 const first=c.state.stageRuns.find(r=>r.id==='verify'),rerun={...first,id:'reverify',resultRef:'testing.md#repair',historyResultRefs:[first.resultRef]};
 response=c.save({stageRuns:c.state.stageRuns.flatMap(r=>r.id==='handoff'?[rerun,r]:[r]),currentRun:rerun.id});assert.equal(response.status,0,JSON.stringify(response));
 await c.finish('handoff');assert.equal(c.invoke('resume').data.completion.readyForAcceptance,true);
});

test('explicit readable limited scope permits independent review, verification and handoff without invented upstream stages',async t=>{
 for(const stage of ['review','verify','handoff']) {
  const row=sequence.find(r=>r[1]===stage),c=await fixture(t,{partial:true,selected:[sequence[0],row]});
  if(stage==='review') {const response=c.save({stageRuns:c.state.stageRuns.map(r=>{const copy={...r};delete copy.reviewOf;delete copy.overall;return copy;})});assert.equal(response.status,0,JSON.stringify(response));}
  await c.finish('req');await c.finish(row[0]);
  const response=c.save({outcome:{goal:'met',goalConclusionRef:`${row[2]}.md`}});assert.equal(response.status,0,JSON.stringify(response));
  assert.equal(c.invoke('resume').data.completion.status,'partial-scope');assert.equal(c.state.stageRuns.length,2);
 }
});

test('a missing, empty, remote or unresolved limited-scope basis cannot exempt stage entry',async t=>{
 for(const stage of ['review','verify','handoff']) {
  const row=sequence.find(r=>r[1]===stage),c=await fixture(t,{partial:true,selected:[sequence[0],row]});
  if(stage==='review') {const response=c.save({stageRuns:c.state.stageRuns.map(r=>{const copy={...r};delete copy.reviewOf;delete copy.overall;return copy;})});assert.equal(response.status,0,JSON.stringify(response));}
  await fs.writeFile(path.join(c.dir,'source/limited.md'),'');await rejectedWithoutSave(c,c.activate(row[0]));
  await fs.rm(path.join(c.dir,'source/limited.md'));await rejectedWithoutSave(c,c.activate(row[0]));
  for(const partialRef of ['https://example.invalid/scope','source/limited.md#missing']) {
   const other=await fixture(t,{partial:true,partialRef,selected:[sequence[0],row]});await rejectedWithoutSave(other,other.activate(row[0]));
  }
 }
});
