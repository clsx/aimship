import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readState,updateState,renderState} from '../lib/state.mjs';
import {run} from '../lib/cli.mjs';
import {readJSON} from '../lib/io.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {implementationSummary} from '../lib/execution.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),version=(await readJSON(path.join(root,'package.json'))).version;
const runtime={version,activeVersion:version,protocolVersion:1};
async function fixture(t,transform=x=>x){
 const base=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-execution-')));t.after(()=>fs.rm(base,{recursive:true,force:true}));const dir=path.join(base,'delivery');
 await fs.cp(path.join(root,'test/fixtures/preview-19'),dir,{recursive:true});const file=path.join(dir,'.aimship/state.json');let state=transform(await readJSON(file));await fs.writeFile(file,JSON.stringify(state,null,2)+'\n');
 const save=async patch=>state=await updateState(dir,patch,state.revision,version,runtime);
 return {dir,file,save,get state(){return state},read:()=>readState(dir)};
}
const through=(state,id)=>state.stageRuns.slice(0,state.stageRuns.findIndex(r=>r.id===id)+1);
const planned=r=>{const next={...r,progress:'planned'};delete next.result;delete next.resultRef;return next;};
const table=view=>view.split('## Delivery progress')[1].split('Delivery conclusion:')[0];
test('legacy19 six batches plus an overall repair never becomes seven business batches; normal purpose save preserves approvals',async t=>{
 const c=await fixture(t),bytes=await fs.readFile(c.file),before=await c.read();assert.equal(c.state.rulesVersion,'0.1.0-preview.19');assert.equal(c.state.protocolVersion,1);
 assert.equal(c.state.stageRuns.filter(r=>r.stage==='implement').length,7);
 assert.deepEqual(Object.fromEntries(Object.entries(implementationSummary(c.state)).map(([k,v])=>[k,v.length])),{batch:6,repair:0,unclassified:1});
 for(const command of ['read','check','resume'])assert.equal((await run([command,c.dir,'--rules-version',version],{sourceRoot:root})).data.versionMismatch??null,null);
 assert.deepEqual(await fs.readFile(c.file),bytes);
 await renderState(c.dir,c.state.revision,version,runtime);let view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(table(view),/Recorded batches completed: 6/);assert.match(table(view),/unclassified purpose: 1/);assert.doesNotMatch(table(view),/Recorded batches completed: 7/);
 const documentBytes=new Map(await Promise.all(c.state.documents.map(async d=>[d.path,await fs.readFile(path.join(c.dir,d.path))])));
 await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='correct-current-object'?{...r,workType:'repair',repairOf:['overall-initial']}:r)});
 assert.equal(c.state.rulesVersion,version);assert.equal(c.state.protocolVersion,1);assert.equal(c.state.deliveryId,before.state.deliveryId);assert.deepEqual(c.state.reviewHistory,before.state.reviewHistory);assert.deepEqual((await c.read()).review,before.review);assert.deepEqual((await c.read()).completion,before.completion);
 for(const [file,body] of documentBytes)assert.deepEqual(await fs.readFile(path.join(c.dir,file)),body);
 view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(table(view),/Recorded batches completed: 6.*repairs: 1/);assert.doesNotMatch(table(view),/Recorded batches completed: 7|unclassified purpose/);
 // Classification is not permission to omit the repaired object from overall review.
 const bad=c.state.stageRuns.map(r=>r.id==='overall-recheck'?{...r,reviewOf:r.reviewOf.filter(id=>id!=='correct-current-object')}:r);
 await assert.rejects(c.save({stageRuns:bad,currentRun:'overall-recheck'}),{code:'REVIEW_CHECK'});
});
test('one batch continues implementation to its review but stops after passing batch review',async t=>{
 const c=await fixture(t,state=>{const review=planned(state.stageRuns.find(r=>r.id==='inspect-1')),next=planned(state.stageRuns.find(r=>r.id==='work-2'));state.stageRuns=[...through(state,'work-1'),review,next];state.currentRun='work-1';return state;});
 let read=await c.read();assert.equal(read.session.action,'continue-implementation-review');assert.equal(read.session.reviewScope,'batch');assert.equal(read.session.stop,false);assert.equal(read.session.suggestNewSession,false);assert.equal(read.session.nextRun,'inspect-1');
 const history=c.state.reviewHistory;await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='inspect-1'?{...r,progress:'done',result:'passed',resultRef:'review.md#REV-001'}:r),currentRun:'inspect-1',next:{action:'Review this completed batch before starting the next batch'}});
 read=await c.read();assert.equal(read.session.action,'await-continue');assert.equal(read.session.stop,true);assert.equal(c.state.stageRuns.find(r=>r.id==='work-2').progress,'planned');assert.deepEqual(c.state.reviewHistory,history);
 // A stale pointer to an already reviewed implementation does not rerun the review.
 await c.save({currentRun:'work-1'});assert.notEqual((await c.read()).session.action,'continue-implementation-review');
});
test('failed batch review permits scoped repair advice but cannot release the next batch; recheck retains failure',async t=>{
 const c=await fixture(t,state=>{state.stageRuns=[...through(state,'inspect-1').map(r=>r.id==='inspect-1'?{...r,result:'failed'}:r),planned(state.stageRuns.find(r=>r.id==='work-2'))];state.currentRun='inspect-1';return state;});
 let read=await c.read();assert.equal(read.session.action,'continue-batch-repair');assert.equal(read.session.stop,false);assert.equal(read.review.canProceed,false);
 await assert.rejects(c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='work-2'?{...r,progress:'active'}:r),currentRun:'work-2'}),{code:'REVIEW_CHECK'});
 const correction={...c.state.stageRuns.find(r=>r.id==='work-1'),workType:'batch',scope:'Current batch including its repaired finding'};
 const recheck={id:'local-finding-recheck',stage:'review',scope:'Recheck same batch and correction',progress:'done',result:'passed',inputRefs:[],outputRefs:['review.md'],resultRef:'review.md#REV-008',historyResultRefs:['review.md#REV-001'],reviewOf:['work-1'],overall:false};
 await c.save({stageRuns:[...c.state.stageRuns.slice(0,-1).map(r=>r.id===correction.id?correction:r),recheck,c.state.stageRuns.at(-1)],currentRun:recheck.id});read=await c.read();assert.equal(read.review.runs.find(r=>r.id==='inspect-1').resolvedBy,recheck.id);assert.equal(c.state.stageRuns.find(r=>r.id==='inspect-1').result,'failed');assert.equal(read.session.stop,true);assert.equal(c.state.stageRuns.at(-1).progress,'planned');assert.equal(c.state.stageRuns.filter(r=>r.stage==='implement' && r.progress==='done').length,1);assert.ok(!read.completion.gaps.some(g=>g.includes('Missing passing batch review for work-1.')));
 await c.save({currentRun:'inspect-1'});assert.notEqual((await c.read()).session.action,'continue-batch-repair','resolved historical review does not request repair again');
});
test('explicit overall review stops before formal tests; formal retry summary uses the applicable passing RUN',async t=>{
 const c=await fixture(t,state=>{state.stageRuns=[...through(state,'overall-recheck'),planned(state.stageRuns.find(r=>r.id==='verify-initial'))];state.currentRun='overall-recheck';state.next.action='Overall review passed; formal verification remains unexecuted';return state;});
 const bytes=await fs.readFile(c.file),resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;
 assert.equal(resumed.session.stop,true);assert.equal(resumed.session.action,'await-continue');assert.equal(c.state.stageRuns.at(-1).progress,'planned');assert.deepEqual(await fs.readFile(c.file),bytes);
 const completed=await fixture(t);await renderState(completed.dir,completed.state.revision,version,runtime);const view=await fs.readFile(path.join(completed.dir,'status.md'),'utf8');
 assert.match(table(view),/\| verify \|[^\n]*RUN-002[^\n]*\| Completed \|/);assert.doesNotMatch(view,/recorded unsuccessful result|Say .continue|Continue this delivery|After this stop/);assert.equal(completed.state.stageRuns.find(r=>r.id==='verify-initial').result,'failed');assert.deepEqual(completed.state.stageRuns.find(r=>r.id==='verify-retest').historyResultRefs,['testing.md#RUN-001']);assert.ok(resumed.session.continuation.includes(c.dir));
});
test('content approval and concrete blockers keep their stop despite batch continuation advice',async t=>{
 const c=await fixture(t,state=>{state.stageRuns=through(state,'work-1');state.stageRuns.at(-1).progress='blocked';state.currentRun='work-1';state.next={action:'Resolve the actual permission question',questionRef:'.aimship/init.md'};return state;});assert.equal((await c.read()).session.action,'await-clarification');assert.equal((await c.read()).session.stop,true);
 const pending=await fixture(t,state=>{state.stageRuns=through(state,'req');state.currentRun='req';state.reviewHistory=state.reviewHistory.filter(r=>r.document!=='prd.md'||r.kind==='self-check');return state;});assert.equal((await pending.read()).session.action,'await-review');assert.equal((await pending.read()).session.stop,true);
});
test('numbered editorial headings and one execution progress table preserve the approved plan boundary',async t=>{
 const c=await fixture(t),doc=c.state.documents.find(d=>d.kind==='plan'),file=path.join(c.dir,doc.path),prior=(await c.read()).review.documents.find(d=>d.path===doc.path).digest;
 let n=0,body=(await fs.readFile(file,'utf8')).replace(/^## (.+)$/gm,(_,title)=>`## ${++n}. ${title}`);body=body.replace('## 1. Implementation basis and scope','## 1. Implementation basis and scope\n\n### 1.1 Scope\n\n#### 1.1.1 Scope detail\n');await fs.writeFile(file,body);
 const digest=await reviewFingerprint(c.dir,c.state,doc),basis={document:doc.path,version:doc.version,digest,sourceRef:'source/synthetic-review.md',summary:'Synthetic editorial numbering; obligations unchanged'};
 await c.save({reviewHistory:[...c.state.reviewHistory,{...basis,id:'numbering-self-check',kind:'self-check',result:'passed'},{...basis,id:'numbering-editorial',kind:'editorial',previousDigest:prior}]});
 assert.equal((await c.read()).review.documents.find(d=>d.path===doc.path).status,'approved');
 const approvedDigest=await reviewFingerprint(c.dir,c.state,doc);await fs.appendFile(file,'\n### Current batch progress\n\n| Scope | Implementation | Review | Result | Remaining |\n| --- | --- | --- | --- | --- |\n| TASK-001 | complete | passed | review.md | none |\n');await c.save({next:{action:'The current batch remains reviewed'}});assert.equal(await reviewFingerprint(c.dir,c.state,doc),approvedDigest);assert.equal((await c.read()).review.documents.find(d=>d.path===doc.path).status,'approved');
});

test('an overall repair does not route to a narrower scheduled batch review',async t=>{
 const c=await fixture(t,state=>{state.stageRuns=[...through(state,'correct-current-object'),planned(state.stageRuns.find(r=>r.id==='inspect-correction'))];const repair=state.stageRuns.find(r=>r.id==='correct-current-object');repair.workType='repair';repair.repairOf=['overall-initial'];state.currentRun=repair.id;return state;});
 const resumed=await c.read();assert.equal(resumed.session.reviewScope,'overall-recheck');assert.equal(resumed.session.stop,false);assert.equal(resumed.session.nextRun,null);
 assert.equal(resumed.completion.readyForAcceptance,false);
});

test('omitting optional repairOf saves normally and inspects scope before either scheduled review',async t=>{
 for(const nextId of ['inspect-correction','overall-recheck']) {
  const c=await fixture(t,state=>{state.stageRuns=[...through(state,'correct-current-object'),planned(state.stageRuns.find(r=>r.id===nextId))];state.currentRun='correct-current-object';return state;});
  const original=(await c.read()).review.documents.map(d=>[d.path,d.status,d.digest]);
  await c.save({stageRuns:c.state.stageRuns.map(r=>r.id===c.state.currentRun?{...r,workType:'repair'}:r),next:{action:'Recheck the original overall repair scope'}});
  assert.equal(Object.hasOwn(c.state.stageRuns.find(r=>r.id===c.state.currentRun),'repairOf'),false);
  const bytes=await fs.readFile(c.file),read=await c.read();
  assert.equal(read.session.action,'inspect-review-scope');assert.equal(read.session.reviewScope,null);assert.equal(read.session.nextRun,null);assert.equal(read.session.stop,false);
  assert.match(read.session.instruction,/original review.*batch or overall scope/);assert.ok(read.session.continuation.includes(read.session.instruction));
  assert.equal(read.completion.readyForAcceptance,false);assert.equal(c.state.stageRuns.find(r=>r.id==='overall-initial').result,'failed');
  assert.deepEqual(read.review.documents.map(d=>[d.path,d.status,d.digest]),original);assert.deepEqual(await fs.readFile(c.file),bytes);
 }
});

test('repair scope follows explicit review responsibility and leaves a non-review basis unresolved',async t=>{
 for(const [basis,nextId,scope,action,selected] of [
  ['inspect-6','inspect-correction','recheck','continue-implementation-review','inspect-correction'],
  ['overall-initial','overall-recheck','overall-recheck','continue-implementation-review','overall-recheck'],
  ['plan','inspect-correction',null,'inspect-review-scope',null]
 ]) {
  const c=await fixture(t,state=>{state.stageRuns=[...through(state,'correct-current-object'),planned(state.stageRuns.find(r=>r.id===nextId))];state.currentRun='correct-current-object';return state;});
  await c.save({stageRuns:c.state.stageRuns.map(r=>r.id===c.state.currentRun?{...r,workType:'repair',repairOf:[basis]}:r)});
  const read=await c.read();assert.equal(read.session.reviewScope,scope,basis);assert.equal(read.session.action,action,basis);assert.equal(read.session.nextRun,selected,basis);assert.equal(read.session.stop,false,basis);assert.equal(read.completion.readyForAcceptance,false);
 }
});
