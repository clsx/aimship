import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initState,updateState,readState} from '../lib/state.mjs';
import {sessionAdvice} from '../lib/delivery.mjs';
import {run} from '../lib/cli.mjs';
import {documentFixture} from '../scripts/testing/documents.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
async function fixture(t,language='en',goal={summary:'Synthetic selected-order export'}) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-guidance-')));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'.aimship'));await fs.mkdir(path.join(dir,'source'));
 await fs.writeFile(path.join(dir,'.aimship/init.md'),'# Initialization\n\nOriginal commission: export selected orders.\nLanguage: '+language+'\n');
 const runtime={version,activeVersion:version,dataRoot:path.dirname(dir)};
 let state=await initState(dir,{language,goal},version,runtime);
 return {dir,runtime,get state(){return state},save:async patch=>state=await updateState(dir,patch,state.revision,version,runtime)};
}
const reg=kind=>({kind,path:kind+'.md',mode:'new',version:'1'});
const stage=(id,progress='done')=>({id,stage:id,scope:'Synthetic export',progress,inputRefs:['prd.md'],outputRefs:[id==='requirements'?'prd.md':'tech-design.md'],...(progress==='done'?{result:'passed',resultRef:id==='requirements'?'prd.md#requirements':'tech-design.md#coverage'}:{})});
async function design(t) {
 const c=await fixture(t);
 for(const kind of ['prd','tech-design'])await fs.writeFile(path.join(c.dir,kind+'.md'),await documentFixture(kind));
 await fs.appendFile(path.join(c.dir,'tech-design.md'),'\n### Q-001 — Is the isolated test fixture available?\n\nResolve before verification. Contract and test-case design can continue; use synthetic inputs while preparing cases. No business requirement is changed.\n');
 await c.save({goalRef:'prd.md',documents:[reg('prd'),reg('tech-design')],documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},stageRuns:[stage('requirements')],currentRun:'requirements'});
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,['prd.md'])});
 await c.save({stageRuns:[...c.state.stageRuns,stage('tech-design')],currentRun:'tech-design'});
 return c;
}
test('new initialization saves standard endpoint, full progress and one neutral reminder in both languages',async t=>{
 for(const language of ['en','zh-CN']) {
  const c=await fixture(t,language),receipt=c.state.writeResult.receipt;
  assert.match(c.state.goal.endpoint,language==='en'?/Implementation, review, independent verification/:/完成实现、评审、独立验证/);
  assert.ok(receipt.workspaceHint.includes(c.dir));assert.match(receipt.workspaceHint,language==='en'?/ignore this if already added/:/已添加则忽略/);
  assert.doesNotMatch(receipt.workspaceHint,/--add-dir|Cursor|Claude|Codex|菜单/);
  assert.equal(c.state.goalRef,'.aimship/init.md');assert.equal(c.state.writeResult.session.suggestNewSession,false);
  assert.deepEqual(await fs.readdir(path.join(c.dir,'source')),[]);
  const view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');
  for(const label of language==='en'?['requirements','tech-design','test-design','plan','implement','review','verify','handoff']:['需求','技术设计','测试设计','实施计划','实施','审查','验证','交付验收'])assert.ok(view.includes(label),label);
  assert.doesNotMatch(view,/Missing current|\.aimship\/init.md/);
  const init=await fs.readFile(path.join(c.dir,'.aimship/init.md'));
  for(const command of ['read','check','resume']) {
   const out=(await run([command,c.dir,'--rules-version',version],{sourceRoot:root})).data;
   if(command==='check'){assert.equal(out.structure,'valid');assert.deepEqual(out.documents.issues,[]);}else assert.equal(out.state.deliveryId,c.state.deliveryId);
  }
  await c.save({next:{action:'Clarify export columns'}});
  assert.equal(c.state.writeResult.receipt.workspaceHint,undefined);
  assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/init.md')),init);
 }
 const limited=await fixture(t,'en',{summary:'Synthetic design task',endpoint:'Technical design only'});
 assert.equal(limited.state.goal.endpoint,'Technical design only');
});
test('default scope reaches design without a second endpoint decision, while PRD review remains required',async t=>{
 const c=await fixture(t);
 for(const kind of ['prd','tech-design'])await fs.writeFile(path.join(c.dir,kind+'.md'),await documentFixture(kind));
 await c.save({goalRef:'prd.md',documents:[reg('prd'),reg('tech-design')],documentPolicy:{authority:'authored'},stageRuns:[stage('requirements')],currentRun:'requirements'});
 const advance={stageRuns:[...c.state.stageRuns,stage('tech-design','active')],currentRun:'tech-design'};
 await assert.rejects(c.save(advance),{code:'REVIEW_CHECK'});
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,['prd.md'])});await c.save(advance);
 assert.equal(c.state.goal.decisionRef,undefined);assert.equal(c.state.goalHistory,undefined);
 assert.equal((await readState(c.dir)).review.canProceed,true);
});
test('initialization edits do not replace formal approvals or permit unreviewed business changes',async t=>{
 const c=await design(t);await c.save({reviewHistory:await approveFixture(c.dir,c.state,['tech-design.md'])});
 const history=structuredClone(c.state.reviewHistory),goal=structuredClone(c.state.goal);
 await fs.appendFile(path.join(c.dir,'.aimship/init.md'),'\nMaterial location corrected: workspace/materials.\n');
 await c.save({});assert.deepEqual(c.state.reviewHistory,history);assert.deepEqual(c.state.goal,goal);
 await fs.appendFile(path.join(c.dir,'prd.md'),'\nChanged obligation: export unselected orders too.\n');
 await assert.rejects(c.save({}),{code:'REVIEW_CHECK'});
});
test('document questions stay open through approval and independent preparation, but current blockers retain their stop',async t=>{
 const c=await design(t),file=path.join(c.dir,'tech-design.md'),before=await fs.readFile(file);
 assert.equal((await readState(c.dir)).session.action,'await-review');
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,['tech-design.md'])});
 assert.equal((await readState(c.dir)).session.action,'await-continue');assert.equal(c.state.next.questionRef,undefined);
 await fs.writeFile(path.join(c.dir,'testing.md'),await documentFixture('testing'));
 const tests={id:'cases',stage:'test-design',scope:'Prepare synthetic cases while test fixture is pending',progress:'active',inputRefs:['tech-design.md'],outputRefs:['testing.md']};
 await c.save({documents:[...c.state.documents,reg('testing')],stageRuns:[...c.state.stageRuns,tests],currentRun:'cases'});
 assert.equal((await readState(c.dir)).review.canProceed,true);assert.deepEqual(await fs.readFile(file),before);
 await c.save({stageRuns:c.state.stageRuns.map(r=>r.id==='cases'?{...r,progress:'blocked'}:r),next:{action:'Fixture semantics now affect the expected test result; resolve Q-001.',questionRef:'tech-design.md#Q-001'}});
 for(let i=0;i<2;i++) {
  const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;
  assert.equal(resumed.session.action,'await-clarification');assert.equal(resumed.canProceed,false);
 }
 assert.deepEqual(await fs.readFile(file),before);
});
test('new-session advice follows major work transitions, independently from every saved stop',()=>{
 const cases=[
  ['requirements','tech-design',true,{}],['requirements','prototype',false,{}],['prototype','tech-design',true,{}],
  ['tech-design','contract',false,{}],['tech-design','test-design',true,{}],['contract','test-design',true,{}],
  ['test-design','plan',false,{}],['plan','implement',true,{}],['implement','review',false,{}],
  ['review','implement',true,{reviewOf:['batch']}],['review','review',true,{reviewOf:['batch']}],
  ['review','verify',true,{overall:true,reviewOf:['batch']}],['verify','handoff',false,{}]
 ];
 for(const [kind,nextKind,expected,extra] of cases)for(const pending of [false,true]) {
  const current={id:'current',stage:kind,progress:'done',result:'passed',...extra};
  const next={id:'next',stage:nextKind,progress:'planned'};
  const state={language:'en',goal:{endpoint:'Standard'},stageRuns:[current,next],currentRun:'current',documentPolicy:{interface:'none',databases:[]},deliveryPolicy:{version:1},outcome:{goal:'in-progress'},next:{action:'Review or continue'}};
  const review={documents:[{path:'doc.md',input:false}],pending:pending?[{run:'current',document:'doc.md',status:'pending'}]:[],runs:[{id:'current',ready:!pending,releaseReady:!pending,blockedBy:[]},{id:'next',ready:false,blockedBy:[]}]};
  const advice=sessionAdvice('/synthetic',state,review);
  assert.equal(advice.stop,true,kind);assert.equal(advice.suggestNewSession,expected,kind+' → '+nextKind);
  if(pending){assert.equal(advice.continuation,null);if(expected)assert.match(advice.instruction,/review this document/);}
  else if(!expected)assert.doesNotMatch(advice.instruction,/new session/);
 }
});
