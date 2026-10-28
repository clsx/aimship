import { documentFixture } from '../scripts/testing/documents.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initState, updateState, readState } from '../lib/state.mjs';
import { reviewStatus, reviewFingerprint } from '../lib/approvals.mjs';
import { run } from '../lib/cli.mjs';
import { approveFixture } from '../scripts/testing/reviews.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
const runtime={version,activeVersion:version,dataRoot:await fs.realpath(os.tmpdir())};
const reg=kind=>({kind,path:`${kind}.md`,mode:'new',version:'1'});
const stage=(id,kind,progress='planned',extra={})=>({id,stage:kind,scope:'synthetic bounded work',progress,inputRefs:[],outputRefs:[],...extra});
async function setup(t, extra={}, approvedInputs=[]) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-review-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic review commission.');
 await fs.writeFile(path.join(dir,'source/decision.md'),'Synthetic explicit approve current document. Not a real user message.');
 await fs.writeFile(path.join(dir,'source/limited.md'),'Synthetic explicit commission for independent review or verification only; not a standard development delivery.');
 for(const kind of ['prd','tech-design','plan','testing','diagnosis','scope','review']) await fs.writeFile(path.join(dir,`${kind}.md`),await documentFixture(kind));
 const input={language:'en',goal:{summary:'Review state semantics',endpoint:'bounded synthetic test'},goalRef:'prd.md',documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:[reg('prd'),reg('tech-design')],stageRuns:[stage('requirements','requirements','done',{outputRefs:['prd.md'],resultRef:'prd.md#requirements'}),stage('design','tech-design')],currentRun:'requirements',...extra};
 // Isolated later-stage fixtures still supply real registered, synthetically approved inputs.
 for(const kind of approvedInputs) if(!input.documents.some(d=>d.kind===kind)) input.documents.push(reg(kind));
 if(approvedInputs.length) input.reviewHistory=await approveFixture(dir,input,approvedInputs.map(k=>`${k}.md`));
 let state=await initState(dir,input,version,runtime);
 const save=async patch=>state=await updateState(dir,patch,state.revision,version,runtime);
 const approve=async(files)=>save({reviewHistory:await approveFixture(dir,state,files)});
 return {dir,get state(){return state},save,approve};
}
test('approval: done and self-check cannot release dependency; explicit approval can; resume keeps stop',async t=>{
 const c=await setup(t); const before=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 for(const command of ['read','check','resume']) {
  const result=(await run([command,c.dir,'--rules-version',version],{sourceRoot:root})).data;
  assert.equal(result.review.pending[0].document,'prd.md');
  if(command==='resume')assert.equal(result.canProceed,false);
 }
 assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),before);
 assert.match(await fs.readFile(path.join(c.dir,'status.md'),'utf8'),/Awaiting review:.*prd.md/);
 const advance=()=>c.save({stageRuns:[c.state.stageRuns[0],{...c.state.stageRuns[1],progress:'active'}],currentRun:'design'});
 await assert.rejects(advance(),{code:'REVIEW_CHECK'});
 const history=await approveFixture(c.dir,c.state,['prd.md']);await c.save({reviewHistory:history.slice(0,1)});
 await assert.rejects(advance(),{code:'REVIEW_CHECK'});
 await c.save({reviewHistory:[...c.state.reviewHistory,history[1]]});await advance();
 assert.equal(c.state.outcome.acceptance,'not-recorded');assert.equal((await readState(c.dir)).review.documents[0].status,'approved');
 assert.equal((await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data.canProceed,true);
});
test('approval: question, silence, result viewing, missing self-check and forged current digest are rejected',async t=>{
 const c=await setup(t), records=await approveFixture(c.dir,c.state,['prd.md']);
 await assert.rejects(c.save({reviewHistory:[records[1]]}),{code:'REVIEW_CHECK'});
 for(const decision of ['question','silence','show-results',undefined])await assert.rejects(c.save({reviewHistory:[records[0],{...records[1],decision}]}),{code:'REVIEW_CHECK'});
 await assert.rejects(c.save({reviewHistory:[records[0],{...records[1],digest:'0'.repeat(64)}]}),{code:'REVIEW_CHECK'});
 await assert.rejects(c.save({reviewHistory:[{...records[0],sourceRef:'source/missing.md'}]}),{code:'REVIEW_CHECK'});
 await assert.rejects(c.save({reviewHistory:[{...records[0],sourceRef:'https://example.invalid/approval'}]}),{code:'REVIEW_CHECK'});
 assert.equal(c.state.revision,0);
});
test('approval: edit request revokes approval; revised content requires fresh self-check and approval; history immutable',async t=>{
 const c=await setup(t);await c.approve(['prd.md']); const historical=structuredClone(c.state.reviewHistory);
 const approved=historical.at(-1); await c.save({reviewHistory:[...historical,{...approved,id:'request-edits',kind:'changes-requested',summary:'Synthetic request: revise requirement'}]});
 assert.equal((await readState(c.dir)).review.documents[0].status,'changes-requested');
 await fs.appendFile(path.join(c.dir,'prd.md'),'\nChanged observable behavior.');
 await assert.rejects(c.save({}),{code:'REVIEW_CHECK'});
 await c.save({documents:c.state.documents.map(d=>d.path==='prd.md'?{...d,version:'2'}:d),openChanges:[{id:'CHG-001',ref:'source/decision.md',status:'open'}]});
 assert.equal(c.state.stageRuns[0].applicability,'needs-review');
 assert.equal((await readState(c.dir)).review.documents[0].approval,null);
 await assert.rejects(c.save({reviewHistory:[]}),{code:'REVIEW_CHECK'});
 await assert.rejects(c.save({reviewHistory:[{...c.state.reviewHistory[0],summary:'rewritten'},...c.state.reviewHistory.slice(1)]}),{code:'REVIEW_CHECK'});
 await c.approve(['prd.md']);await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='requirements'?{...r,applicability:'current'}:r)});
 assert.deepEqual(c.state.reviewHistory.slice(0,2),historical);
 assert.equal((await readState(c.dir)).review.runs[0].ready,true);
});
test('approval: material reflow suspends affected branches, preserves unrelated results, and restores by dependency',async t=>{
 const c=await setup(t,{documents:[reg('prd'),reg('tech-design'),reg('diagnosis')],stageRuns:[stage('requirements','requirements','done',{outputRefs:['prd.md'],resultRef:'prd.md#requirements'}),stage('design','tech-design'),stage('independent','diagnose','planned',{dependsOn:[]})]});
 await c.approve(['prd.md']);await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='design'?{...r,progress:'done',resultRef:'tech-design.md#coverage',outputRefs:['tech-design.md']}:r)});await c.approve(['tech-design.md']);
 await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='independent'?{...r,progress:'done',resultRef:'diagnosis.md#conclusion',outputRefs:['diagnosis.md']}:r)});await c.approve(['diagnosis.md']);
 const original=structuredClone(c.state.stageRuns[2]);await fs.appendFile(path.join(c.dir,'prd.md'),'New behavior');
 await c.save({openChanges:[{id:'CHG-001',ref:'source/decision.md',status:'open'}],documents:c.state.documents.map(d=>d.kind==='prd'?{...d,version:'2'}:d)});
 assert.equal(c.state.stageRuns[0].applicability,'needs-review');assert.equal(c.state.stageRuns[1].applicability,'needs-review');assert.deepEqual(c.state.stageRuns[2],original);
 await assert.rejects(c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='design'?{...r,applicability:'current'}:r)}),{code:'REVIEW_CHECK'});
 await c.approve(['prd.md']);await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='requirements'?{...r,applicability:'current'}:r)});
 await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='design'?{...r,applicability:'current'}:r)});
 assert.equal((await readState(c.dir)).review.runs[1].ready,true);
});
test('approval: editorial reconciliation retains user approval without downstream re-review',async t=>{
 const c=await setup(t);await c.approve(['prd.md']);const old=c.state.reviewHistory.at(-1);
 await fs.appendFile(path.join(c.dir,'prd.md'),'\n');const digest=await reviewFingerprint(c.dir,c.state,c.state.documents[0]);
 const check={id:'format-check',kind:'self-check',result:'passed',document:'prd.md',version:'1',digest,sourceRef:'source/decision.md',summary:'Only trailing whitespace; meaning unchanged.'};
 await c.save({reviewHistory:[...c.state.reviewHistory,check,{...check,id:'format-reconciliation',kind:'editorial',previousDigest:old.digest}]});
 assert.equal(c.state.reviewHistory.filter(r=>r.kind==='approved').length,1);assert.equal((await readState(c.dir)).review.runs[0].ready,true);
});
test('approval: testing execution and plan execution do not revoke design approval',async t=>{
 const c=await setup(t,{documents:[reg('prd'),reg('testing'),reg('plan')],stageRuns:[stage('cases','test-design','done',{resultRef:'testing.md#cases',outputRefs:['testing.md']}),stage('plan','plan')],currentRun:'cases'},['prd','tech-design']);
 await c.approve(['testing.md']);await c.save({stageRuns:[c.state.stageRuns[0],{...c.state.stageRuns[1],progress:'done',resultRef:'plan.md#tasks',outputRefs:['plan.md']}]});await c.approve(['plan.md']);
 await fs.appendFile(path.join(c.dir,'testing.md'),'New RUN evidence.');await fs.appendFile(path.join(c.dir,'plan.md'),'TASK actual execution.');await c.save({});
 assert.equal((await readState(c.dir)).review.documents.filter(d=>['plan.md','testing.md'].includes(d.path)).every(d=>d.status==='approved'),true);
 await fs.writeFile(path.join(c.dir,'testing.md'),(await fs.readFile(path.join(c.dir,'testing.md'),'utf8')).replace('## Test cases','## Test cases\nChanged expectation.'));
 assert.equal((await readState(c.dir)).review.documents.find(d=>d.path==='testing.md').status,'self-check-required');
});
test('approval: SQL follows technical review, SQL-only contract requires every target and individual approvals',async t=>{
 const c=await setup(t,{documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:['main','audit']},stageRuns:[stage('design','tech-design','done',{outputRefs:['tech-design.md'],resultRef:'tech-design.md#coverage'}),stage('sql','contract'),stage('cases','test-design')],currentRun:'design'},['prd']);
 await c.approve(['tech-design.md']);
 for(const id of ['main','audit'])await fs.writeFile(path.join(c.dir,`database-${id}.sql`),`-- target ${id}; synthetic sqlite schema v1; not executed\nCREATE TABLE example(id INTEGER);`);
 const docs=[...c.state.documents,...['main','audit'].map(id=>({kind:'sql',path:`database-${id}.sql`,mode:'new',version:'1'})),reg('testing')];
 await c.save({documents:docs,stageRuns:c.state.stageRuns.map(r=>r.id==='sql'?{...r,progress:'done',outputRefs:['database-main.sql','database-audit.sql'],resultRef:'database-main.sql'}:r),currentRun:'sql'});
 await c.approve(['database-main.sql']);const advance=()=>c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='cases'?{...r,progress:'active'}:r)});
 await assert.rejects(advance(),{code:'REVIEW_CHECK'});await c.approve(['database-audit.sql']);await advance();
});
test('approval: design-only, investigation, adopted scope, prototype and review-only retain their selected endpoints',async t=>{
 for(const [kind,name,section] of [['tech-design','tech-design','coverage'],['diagnosis','diagnose','conclusion'],['scope','scope','goals']]) {
  const isScope=kind==='scope';const c=await setup(t,{goalRef:isScope?'scope.md':'prd.md',documentPolicy:{authority:isScope?'adopted':'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:[reg(isScope?'scope':'prd'),...(!isScope?[reg(kind)]:[])],stageRuns:[stage('only',name,'done',{resultRef:`${kind}.md#${section}`,outputRefs:[`${kind}.md`]})],currentRun:'only'},kind==='tech-design'?['prd']:[]);
  await c.approve([`${kind}.md`]);assert.equal((await readState(c.dir)).review.runs[0].ready,true);assert.equal(c.state.stageRuns.length,1);
 }
 const c=await setup(t,{deliveryPolicy:{version:1,partialRef:'source/limited.md'},stageRuns:[stage('review','review')],currentRun:'review',documents:[reg('prd'),{kind:'review',path:'review.md',mode:'reused',version:'1',basisRef:'source/request.md'}]});
 await c.save({stageRuns:[{...c.state.stageRuns[0],progress:'done',outputRefs:['review.md'],resultRef:'review.md'}]});assert.equal((await readState(c.dir)).review.runs[0].ready,true);
});
test('approval: test cases must precede plan and final goal cannot bypass outstanding approval',async t=>{
 await assert.rejects(setup(t,{documents:[reg('prd'),reg('plan'),reg('testing')],stageRuns:[stage('plan','plan'),stage('cases','test-design')],currentRun:'plan'}),{code:'REVIEW_CHECK'});
 const c=await setup(t);await assert.rejects(c.save({outcome:{goal:'met',goalConclusionRef:'prd.md'}}),{code:'REVIEW_CHECK'});
});
test('approval: prototype assets are bound and verify-only does not invent upstream work',async t=>{
 const c=await setup(t,{stageRuns:[],currentRun:null});await c.approve(['prd.md']);await fs.mkdir(path.join(c.dir,'prototype'));
 await fs.writeFile(path.join(c.dir,'prototype/index.html'),'<img src="screen.bin">');await fs.writeFile(path.join(c.dir,'prototype/screen.bin'),Buffer.from([0xff,0x00]));
 await c.save({documents:[...c.state.documents,{kind:'prototype',path:'prototype/index.html',mode:'new',version:'1',assetRefs:['prototype/screen.bin']}],stageRuns:[stage('prototype','prototype','done',{outputRefs:['prototype/index.html'],resultRef:'prototype/index.html'})],currentRun:'prototype'});
 await c.approve(['prototype/index.html']);assert.equal((await readState(c.dir)).review.runs[0].ready,true);
 await fs.writeFile(path.join(c.dir,'prototype/screen.bin'),Buffer.from([0xfe,0x00]));assert.equal((await readState(c.dir)).review.runs[0].ready,false);
 const v=await setup(t,{deliveryPolicy:{version:1,partialRef:'source/limited.md'},documents:[reg('prd'),{kind:'testing',path:'testing.md',mode:'reused',version:'existing-v1',basisRef:'source/request.md'}],stageRuns:[stage('verify','verify')],currentRun:'verify'});
 await v.save({stageRuns:[{...v.state.stageRuns[0],progress:'done',outputRefs:['testing.md'],resultRef:'testing.md'}]});assert.equal(v.state.stageRuns.length,1);assert.equal((await readState(v.dir)).review.runs[0].ready,true);
});
test('approval: fresh approval cannot hide a material revision without CHG/version and source evidence remains inspectable',async t=>{
 const c=await setup(t);await c.approve(['prd.md']);await fs.appendFile(path.join(c.dir,'prd.md'),'New meaning');
 const records=await approveFixture(c.dir,c.state,['prd.md']);
 await assert.rejects(c.save({reviewHistory:records}),{code:'REVIEW_CHECK'});
 await assert.rejects(c.save({reviewHistory:records,openChanges:[{id:'CHG-001',ref:'source/decision.md',status:'open'}]}),{code:'REVIEW_CHECK'});
 const other=await setup(t);await other.approve(['prd.md']);await fs.appendFile(path.join(other.dir,'source/synthetic-review.md'),'Changed evidence');
 const status=(await readState(other.dir)).review;assert.equal(status.documents[0].status,'evidence-changed');assert.equal(status.runs[0].ready,false);assert.ok(status.evidenceIssues.length);
});
test('approval: corrupted review state can recover without inventing approval or re-executing work',async t=>{
 const {recoverState}=await import('../lib/state.mjs');const c=await setup(t);await c.save({next:{action:'Saved unchanged pending review'}});
 const file=path.join(c.dir,'.aimship/state.json');const corrupt=JSON.parse(await fs.readFile(file));corrupt.reviewHistory=[{id:'broken'}];await fs.writeFile(file,JSON.stringify(corrupt));
 const recovered=await recoverState(c.dir,0,version,runtime);assert.ok(recovered.revision>1);assert.deepEqual(recovered.reviewHistory,[]);assert.equal((await readState(c.dir)).review.runs[0].ready,false);
});
test('approval: real CLI reports the stop and accepts an explicit recorded approval at the same revision',async t=>{
 const {spawnSync}=await import('node:child_process');const c=await setup(t);
 const cli=(command,input)=>spawnSync(process.execPath,[path.join(root,'bin/aimship.mjs'),command,c.dir,'--rules-version',version,...(input?['--revision',String(c.state.revision),'--input','-']:[])],{input:input?JSON.stringify(input):undefined,encoding:'utf8',timeout:10000});
 let result=cli('resume');assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).data.canProceed,false);
 result=cli('update',{reviewHistory:await approveFixture(c.dir,c.state,['prd.md'])});assert.equal(result.status,0,result.stderr);
 result=cli('resume');assert.equal(result.status,0,result.stderr);const resumed=JSON.parse(result.stdout).data;assert.equal(resumed.canProceed,true);assert.equal(resumed.review.documents[0].status,'approved');assert.equal(resumed.state.outcome.acceptance,'not-recorded');
});

test('approval: failed self-check is preserved and cannot be used to approve or release work',async t=>{
 const c=await setup(t),records=await approveFixture(c.dir,c.state,['prd.md']);await c.save({reviewHistory:[{...records[0],result:'failed'}]});
 assert.equal((await readState(c.dir)).review.documents[0].status,'self-check-failed');
 await assert.rejects(c.save({reviewHistory:[...c.state.reviewHistory,records[1]]}),{code:'REVIEW_CHECK'});
 await c.approve(['prd.md']);assert.equal(c.state.reviewHistory[0].result,'failed');assert.equal((await readState(c.dir)).review.runs[0].ready,true);
});
