import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initState,updateState,readState} from '../lib/state.mjs';
import {run} from '../lib/cli.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {documentFixture} from '../scripts/testing/documents.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
const runtime={version,activeVersion:version,dataRoot:await fs.realpath(os.tmpdir())};
const supplied='# Supplied PRD\n\n| REQ-001 | Normalize duplicate lines. |\n| AC-001 | Repeated lines appear once. |\n';
async function fixture(t) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-input-review-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));
 await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic user request: use my supplied PRD and prototype unchanged to deliver this feature, with local implementation and tests, no deployment.');
 await fs.writeFile(path.join(dir,'source/prd.md'),supplied);
 const doc={kind:'prd',path:'source/prd.md',mode:'input',version:'1',basisRef:'source/request.md'};
 const req={id:'req',stage:'requirements',scope:'Use supplied requirements',progress:'done',result:'passed',inputRefs:['source/request.md'],outputRefs:[doc.path],resultRef:doc.path};
 const input={language:'zh-CN',goal:{summary:'Synthetic supplied input',endpoint:'Local implementation and verification'},goalRef:doc.path,documentPolicy:{authority:'adopted',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:[doc],stageRuns:[req],currentRun:'req',next:{action:'需求输入已接纳；等待继续技术设计。'}};
 let state;return {dir,doc,req,input,get state(){return state},init:async extra=>state=await initState(dir,{...input,...extra},version,runtime),save:async patch=>state=await updateState(dir,patch,state.revision,version,runtime)};
}
async function checks(c,files,prospective=c.state) {
 const sourceRef='source/synthetic-check.md';
 await fs.writeFile(path.join(c.dir,sourceRef),'Synthetic Agent input/content check only. No user review or approval occurred.');
 const records=[...prospective.reviewHistory];
 for(const file of files) {const doc=prospective.documents.find(d=>d.path===file);records.push({id:`check-${records.length+1}`,kind:'self-check',document:file,version:doc.version,digest:await reviewFingerprint(c.dir,prospective,doc),sourceRef,result:'passed',summary:'Synthetic Agent check, not a human approval.'});}
 return records;
}
test('clear supplied PRD/prototype inputs and internal records finish intake without human approvals',async t=>{
 const c=await fixture(t);await fs.writeFile(path.join(c.dir,'source/prototype.html'),'<h1>Synthetic supplied prototype</h1>');
 await fs.writeFile(path.join(c.dir,'source/adoption-note.md'),'Synthetic material inventory; no business decisions.');
 const prototype={kind:'prototype',path:'source/prototype.html',mode:'input',version:'1',basisRef:'source/request.md'};
 await c.init({documents:[c.doc,prototype,{kind:'source',path:'source/adoption-note.md',mode:'new',version:'1'}],stageRuns:[c.req,{id:'proto',stage:'prototype',scope:'Check supplied interaction input',progress:'planned',inputRefs:[c.doc.path],outputRefs:[prototype.path]}]});
 await c.save({reviewHistory:await checks(c,[c.doc.path,prototype.path])});
 assert.ok(c.state.reviewHistory.every(r=>r.kind==='self-check'));
 let read=await readState(c.dir);assert.equal(read.review.documents.length,2);assert.ok(read.review.documents.every(d=>d.status==='adopted' && d.approval===null));
 assert.equal(read.session.action,'await-continue');assert.equal(read.session.stop,true);assert.equal(read.review.pending.length,0);
 for(let i=0;i<2;i++){const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;assert.equal(resumed.session.action,'await-continue');assert.equal(resumed.review.documents[0].approval,null);}
 await c.save({stageRuns:[c.req,{...c.state.stageRuns[1],progress:'done',result:'passed',resultRef:prototype.path}],currentRun:'proto'});
 read=await readState(c.dir);assert.equal(read.session.action,'await-continue');assert.equal(read.review.pending.length,0);
 assert.equal(await fs.readFile(path.join(c.dir,c.doc.path),'utf8'),supplied);
 const view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(view,/已采用现有材料|已采用输入/);assert.doesNotMatch(view,/待审核|请确认采用|请审核/);
 await assert.rejects(c.save({reviewHistory:await approveFixture(c.dir,c.state,[c.doc.path])}),{code:'REVIEW_CHECK'});
});
test('files alone do not establish intent; a concrete question restores as clarification, then resolves without approval',async t=>{
 const c=await fixture(t);await fs.writeFile(path.join(c.dir,'source/request.md'),'Synthetic user asks to inspect the workspace; which requirements apply is not yet specified.');
 await fs.writeFile(path.join(c.dir,'source/question.md'),'Which supplied PRD applies to this iteration: A or B? This changes the feature scope and design inputs.');
 const blocked={...c.req,progress:'blocked',inputRefs:['source/request.md'],outputRefs:[]};delete blocked.resultRef;delete blocked.result;
 await c.init({goalRef:'source/request.md',documentPolicy:{...c.input.documentPolicy,authority:null},documents:[{...c.doc,kind:'source',mode:'reused'}],stageRuns:[blocked],next:{action:'请确认采用A还是B：影响本次范围和设计输入。',questionRef:'source/question.md'}});
 for(let i=0;i<2;i++){const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;assert.equal(resumed.session.action,'await-clarification');assert.equal(resumed.canProceed,false);assert.equal(resumed.review.documents.length,0);}
 let view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(view,/待确认具体问题|请确认下一步所列的具体问题/);assert.doesNotMatch(view,/请审核/);
 await fs.writeFile(path.join(c.dir,'source/answer.md'),'Synthetic explicit user answer: use the supplied PRD A for this delivery.');
 const doc={...c.doc,basisRef:'source/answer.md'};
 await c.save({goalRef:doc.path,documentPolicy:{...c.input.documentPolicy},documents:[doc],stageRuns:[c.req],next:{action:'输入已采用，等待继续。',questionRef:null},reviewHistory:await checks(c,[doc.path],{...c.state,documents:[doc]})});
 assert.equal((await readState(c.dir)).session.action,'await-continue');assert.equal((await readState(c.dir)).review.documents[0].status,'adopted');assert.ok(!c.state.reviewHistory.some(r=>r.kind==='approved'));
 const missing=await fixture(t);await assert.rejects(missing.init({documents:[{...missing.doc,basisRef:'source/missing-request.md'}]}),{code:'REVIEW_CHECK'});
});
test('authored/partial outputs still need review and supplied inputs cannot waive design or plan gates',async t=>{
 const c=await fixture(t);await c.init();await c.save({reviewHistory:await checks(c,[c.doc.path])});
 const design={kind:'tech-design',path:'tech-design.md',mode:'new',version:'1'},testing={kind:'testing',path:'testing.md',mode:'new',version:'1'};
 await fs.writeFile(path.join(c.dir,design.path),await documentFixture('tech-design'));await fs.writeFile(path.join(c.dir,testing.path),await documentFixture('testing'));
 await c.save({documents:[c.doc,design,testing],stageRuns:[c.req,{id:'design',stage:'tech-design',scope:'AI solution',progress:'done',inputRefs:[c.doc.path],outputRefs:[design.path],resultRef:'tech-design.md#coverage'}],currentRun:'design'});
 await c.save({reviewHistory:await checks(c,[design.path])});
 assert.equal((await readState(c.dir)).session.action,'await-review');
 const cases={id:'cases',stage:'test-design',scope:'AI cases',progress:'active',dependsOn:[],inputRefs:[],outputRefs:[testing.path]};
 await assert.rejects(c.save({stageRuns:[...c.state.stageRuns,cases],currentRun:'cases'}),{code:'REVIEW_CHECK'});
 await assert.rejects(c.save({documents:[c.doc,{...design,mode:'input',basisRef:'source/request.md'},testing]}),{code:'INVALID_STATE'});
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,[design.path])});
 await c.save({stageRuns:[...c.state.stageRuns,cases],currentRun:'cases'});
 assert.equal((await readState(c.dir)).session.action,'continue-current');
 const partial=await fixture(t);await fs.writeFile(path.join(partial.dir,'prd.md'),await documentFixture('prd'));
 await partial.init({documentPolicy:{...partial.input.documentPolicy,authority:'authored'},goalRef:'prd.md',documents:[{kind:'prd',path:'prd.md',mode:'new',version:'1'}],stageRuns:[{...partial.req,outputRefs:['prd.md'],resultRef:'prd.md#requirements'}]});
 await partial.save({reviewHistory:await checks(partial,['prd.md'])});assert.equal((await readState(partial.dir)).session.action,'await-review');
});
test('a revised supplied authority requires actual change handling and preserves the previous input',async t=>{
 const c=await fixture(t);await c.init();await c.save({reviewHistory:await checks(c,[c.doc.path])});
 await fs.writeFile(path.join(c.dir,'source/prd-v2.md'),supplied.replace('appear once','appear once in first-seen order'));
 await fs.writeFile(path.join(c.dir,'source/change.md'),'Synthetic user requirement change CHG-001: use the supplied V2, preserve first-seen order.');
 const doc={...c.doc,path:'source/prd-v2.md',version:'2',basisRef:'source/change.md'};
 const patch={goalRef:doc.path,goal:{decisionRef:'source/change.md'},documents:[{...c.doc,kind:'source',mode:'reused'},doc],stageRuns:[{...c.req,outputRefs:[doc.path],resultRef:doc.path,historyResultRefs:[c.doc.path]}]};
 await assert.rejects(c.save(patch),{code:'REVIEW_CHECK'});
 await c.save({...patch,openChanges:[{id:'CHG-001',ref:'source/change.md',status:'open'}],reviewHistory:await checks(c,[doc.path],{...c.state,documents:patch.documents})});
 assert.equal(c.state.stageRuns[0].applicability,'needs-review');
 assert.equal(await fs.readFile(path.join(c.dir,c.doc.path),'utf8'),supplied);
 assert.ok(!c.state.reviewHistory.some(r=>r.kind==='approved'));
 await c.save({stageRuns:c.state.stageRuns.map(r=>({...r,applicability:'current'})),openChanges:[{id:'CHG-001',ref:'source/change.md',status:'closed'}]});
 assert.equal((await readState(c.dir)).session.action,'await-continue');
});

test('saved, read and resumed user guidance stays concrete in both languages without changing stop or diagnostic data',async t=>{
 for(const language of ['zh-CN','en']) {
  const c=await fixture(t);await c.init({language});await c.save({reviewHistory:await checks(c,[c.doc.path])});
  const saved=c.state.writeResult;
  assert.equal(saved.stateSaved,true);assert.equal(saved.receipt.rulesVersion,version);
  assert.equal(saved.session.action,'await-continue');assert.equal(saved.session.stop,true);
  assert.match(saved.session.instruction,language==='zh-CN'?/准备好后可说“继续”/:/Say “continue” when ready/);
  assert.doesNotMatch(saved.session.instruction,/Skill|protocol|批准和继续|wait for the user|规则要求/);
  const snapshot=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
  const read=await readState(c.dir);
  const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;
  for(const result of [read,resumed]) {
   assert.equal(result.session.action,'await-continue');assert.equal(result.session.instruction,saved.session.instruction);
   assert.ok(result.session.note);assert.equal(result.state.rulesVersion,version);
  }
  assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),snapshot);
  let view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');
  assert.ok(view.includes('](source/prd.md)'));assert.ok(view.includes(c.dir));
  assert.doesNotMatch(view,/Skill|Stop for human review|reviewable documents await|wait for the user|“继续”不代表批准/);
  await fs.writeFile(path.join(c.dir,'source/question.md'),'Synthetic specific question: choose A or B; this affects the next design input.');
  await c.save({stageRuns:[{...c.req,progress:'blocked'}],next:{action:language==='zh-CN'?'请选择A或B，影响下一步设计输入。':'Choose A or B; this affects the next design input.',questionRef:'source/question.md'}});
  const question=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;
  assert.equal(question.session.action,'await-clarification');assert.equal(question.canProceed,false);
  assert.match(question.session.instruction,language==='zh-CN'?/请回答下一步所列的具体问题/:/Please answer the question/);
  view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.ok(view.includes('](source/question.md)'));
  assert.doesNotMatch(question.session.instruction,/not a request|不是要求|Skill|protocol/);
 }
});
