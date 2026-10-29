import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initState,updateState,readState,renderState,STAGES} from '../lib/state.mjs';
import {renderText} from '../lib/view.mjs';
import {artifactMap,inspectDocuments} from '../lib/documents.mjs';
import {documentFixture} from '../scripts/testing/documents.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
import {run} from '../lib/cli.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
const runtime={version,activeVersion:version,dataRoot:await fs.realpath(os.tmpdir())};
const policy={authority:'adopted',interaction:true,prototypeCovered:false,interface:null,databases:null};
const supplied='# Provided requirements V1\n\n## Features\n| FR-001 | Register a unique name and password. |\n| BR-001 | Never create duplicate names; show an actionable error. |\n\n## Acceptance\n| AC-001 | Register a new name; it can log in. |\n| AC-002 | Duplicate registration is rejected without changing the account. |\n';
async function fixture(t) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-prd-handoff-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));
 await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic commission: use the supplied account requirements for this delivery. Standard local delivery, no deployment.');
 await fs.writeFile(path.join(dir,'source/provided.md'),supplied);
 const doc={kind:'prd',path:'source/provided.md',mode:'reused',version:'V1',basisRef:'source/request.md'};
 const req={id:'requirements',stage:'requirements',scope:'Adopt account requirements',progress:'done',inputRefs:['source/request.md'],outputRefs:[doc.path],resultRef:doc.path};
 const input={language:'zh-CN',goal:{summary:'合成账号需求',endpoint:'实现、审查、验证与交接；不部署'},goalRef:doc.path,documentPolicy:policy,documents:[doc],stageRuns:[req],currentRun:req.id,next:{action:'请确认当前 PRD 的范围与验收，或指出修改。'}};
 let state;
 return {dir,doc,req,input,get state(){return state},init:async extra=>state=await initState(dir,{...input,...extra},version,runtime),save:async patch=>state=await updateState(dir,patch,state.revision,version,runtime)};
}
test('a reused reviewable PRD is the direct authority: no rewrite, renumbering, Scope or prototype requirement',async t=>{
 const c=await fixture(t);await c.init();
 assert.equal(STAGES.includes('scope'),false);assert.equal((await artifactMap()).documents.scope,undefined);
 assert.equal(await fs.readFile(path.join(c.dir,c.doc.path),'utf8'),supplied);
 assert.equal(await fs.stat(path.join(c.dir,'prd.md')).then(()=>true,()=>false),false);
 assert.equal(await fs.stat(path.join(c.dir,'scope.md')).then(()=>true,()=>false),false);
 let read=await readState(c.dir);assert.equal(read.review.pending[0].document,c.doc.path);assert.equal(read.review.canProceed,false);
 await fs.writeFile(path.join(c.dir,'tech-design.md'),(await documentFixture('tech-design'))+'\nCoverage: FR-001, BR-001, AC-001, AC-002.\n');
 const docs=[c.doc,{kind:'tech-design',path:'tech-design.md',mode:'new',version:'1'}];
 await c.save({documents:docs});
 const design={id:'design',stage:'tech-design',scope:'Account design',progress:'active',inputRefs:[c.doc.path],outputRefs:['tech-design.md']};
 await assert.rejects(c.save({stageRuns:[c.req,design],currentRun:'design'}),{code:'REVIEW_CHECK'});
 const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;
 assert.equal(resumed.session.action,'await-review');assert.equal(resumed.session.stop,true);assert.equal(resumed.canProceed,false);
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,[c.doc.path])});
 assert.equal(c.state.writeResult.session.action,'await-continue');assert.equal(c.state.writeResult.session.suggestNewSession,true);
 const history=structuredClone(c.state.reviewHistory);
 await c.save({stageRuns:[c.req,design],currentRun:'design',next:{action:'完成技术设计'}});
 assert.deepEqual(c.state.reviewHistory,history);
 assert.equal((await inspectDocuments(c.dir,c.state)).issues.length,0);
 assert.equal(await fs.readFile(path.join(c.dir,c.doc.path),'utf8'),supplied);
});
test('evidenced approval of current adopted PRD is reused on initialization and resume; changed content needs review',async t=>{
 const c=await fixture(t);const history=await approveFixture(c.dir,c.input,[c.doc.path]);
 await c.init({reviewHistory:history});
 const read=await readState(c.dir);assert.equal(read.review.documents[0].status,'approved');assert.equal(read.review.pending.length,0);
 for(let i=0;i<2;i++) {const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;assert.equal(resumed.session.action,'await-continue');assert.deepEqual(resumed.state.reviewHistory,c.state.reviewHistory);}
 await fs.appendFile(path.join(c.dir,c.doc.path),'\nChanged requirement: require an additional profile field.');
 assert.equal((await readState(c.dir)).review.documents[0].approval,null);
 assert.equal((await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data.canProceed,false);
 await assert.rejects(c.save({}),{code:'REVIEW_CHECK'});
});
test('partial adoption uses one iteration PRD with original IDs and source links; originals remain intact',async t=>{
 const c=await fixture(t);
 const prd=(await documentFixture('prd')).replaceAll('REQ-001','FR-001')+'\nSource: [FR-001](source/provided.md). Include registration only; exclude profile editing. Original source remains authoritative for its full product.\n';
 await fs.writeFile(path.join(c.dir,'prd.md'),prd);
 await c.init({goalRef:'prd.md',documentPolicy:{...policy,authority:'authored'},documents:[{kind:'prd',path:'prd.md',mode:'new',version:'1'}],stageRuns:[{...c.req,resultRef:'prd.md#requirements',outputRefs:['prd.md']}]});
 assert.deepEqual((await inspectDocuments(c.dir,c.state)).issues,[]);
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,['prd.md'])});
 assert.equal(await fs.readFile(path.join(c.dir,c.doc.path),'utf8'),supplied);
 await fs.writeFile(path.join(c.dir,'prd.md'),prd.replace('[FR-001](source/provided.md)','[FR-999](source/provided.md)'));
 await assert.rejects(c.save({}),{code:'DOCUMENT_CHECK'});
});
test('early intake without PRD/prototype/code shows current work and future progress without missing-stage alarms',async t=>{
 const c=await fixture(t);await c.init({goalRef:'source/request.md',documents:[],stageRuns:[],currentRun:null,documentPolicy:{authority:null,interaction:null,prototypeCovered:null,interface:null,databases:null},next:{action:'澄清注册规则与验收标准'}});
 const read=await readState(c.dir),view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');
 assert.deepEqual(read.state.repositories,[]);assert.equal(read.state.outcome.goal,'in-progress');assert.equal(read.completion.standardComplete,false);
 assert.ok(read.completion.gaps.length>0);assert.ok(!read.completion.gaps.some(x=>x.includes('契约')));
 assert.match(view,/当前阶段: 需求准备/);assert.match(view,/技术设计.*尚未开始/);assert.match(view,/待技术设计确认是否适用/);
 assert.doesNotMatch(view,/缺少当前|缺少本次|终点尚待确认|下一阶段: 未记录|历史目标/);
 assert.ok(view.includes(c.dir));
});
test('progress page separates preparation, self-check and approval, deduplicates materials and places engineering last',async t=>{
 const c=await fixture(t);await c.init({repositories:[{id:'synthetic',path:c.dir,role:'Read-only existing work; unrelated dirty changes retained'}]});
 const history=await approveFixture(c.dir,c.state,[c.doc.path]);await c.save({reviewHistory:history.slice(0,1)});
 const view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');
 assert.match(view,/文档已完成，待审核/);assert.match(view,/自检记录通过 · 待审核/);assert.match(view,/技术设计（批准后）/);
 assert.doesNotMatch(view,/已批准|结果: 未记录|审核协议|缺少/);
 const materials=view.split('## 目标与采用材料')[1].split('## 接续本次交付')[0];
 assert.equal(materials.split('](source/provided.md)').length-1,1);
 assert.ok(view.indexOf('## 当前阶段')<view.indexOf('## 关联工程'));
 assert.ok(view.indexOf('## 接续本次交付')<view.indexOf('## 关联工程'));
});

test('one explicit approval-and-continue update releases design, while a plain continue message does not',async t=>{
 const c=await fixture(t);await c.init();
 await fs.writeFile(path.join(c.dir,'tech-design.md'),await documentFixture('tech-design'));
 await c.save({documents:[c.doc,{kind:'tech-design',path:'tech-design.md',mode:'new',version:'1'}],next:{action:'继续'}});
 assert.equal((await readState(c.dir)).review.canProceed,false);
 const design={id:'design',stage:'tech-design',scope:'Account design',progress:'active',inputRefs:[c.doc.path],outputRefs:['tech-design.md']};
 await assert.rejects(c.save({stageRuns:[c.req,design],currentRun:design.id}),{code:'REVIEW_CHECK'});
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,[c.doc.path]),stageRuns:[c.req,design],currentRun:design.id,next:{action:'完成技术设计'}});
 assert.equal((await readState(c.dir)).session.action,'continue-current');assert.equal(c.state.reviewHistory.length,2);
});

test('adopting a revised PRD preserves the prior source and approval while requiring current-content reapproval',async t=>{
 const c=await fixture(t);await c.init({reviewHistory:await approveFixture(c.dir,c.input,[c.doc.path])});
 const original=await fs.readFile(path.join(c.dir,c.doc.path)),oldHistory=structuredClone(c.state.reviewHistory);
 const nextDoc={...c.doc,path:'source/provided-v2.md',version:'V2'};
 await fs.writeFile(path.join(c.dir,nextDoc.path),supplied.replace('unique name and password','unique name, password and display name'));
 await fs.writeFile(path.join(c.dir,'source/change.md'),'Synthetic explicit requirement change CHG-001: adopt V2 with display name; preserve V1, review changed requirements.');
 const patch={goalRef:nextDoc.path,goal:{decisionRef:'source/change.md'},documents:[{...c.doc,kind:'source'},nextDoc],stageRuns:[{...c.req,outputRefs:[nextDoc.path],resultRef:nextDoc.path,historyResultRefs:[c.doc.path]}],next:{action:'审核 V2 的新增显示名要求'}};
 await assert.rejects(c.save(patch),{code:'REVIEW_CHECK'});
 await c.save({...patch,openChanges:[{id:'CHG-001',ref:'source/change.md',status:'open'}]});
 const read=await readState(c.dir);assert.equal(read.review.documents[0].approval,null);assert.equal(read.state.stageRuns[0].applicability,'needs-review');assert.equal(read.review.canProceed,false);
 assert.deepEqual(await fs.readFile(path.join(c.dir,c.doc.path)),original);assert.deepEqual(c.state.reviewHistory,oldHistory);
 await c.save({reviewHistory:await approveFixture(c.dir,c.state,[nextDoc.path])});
 await c.save({stageRuns:c.state.stageRuns.map(r=>({...r,applicability:'current'})),openChanges:[{id:'CHG-001',ref:'source/change.md',status:'closed'}]});
 assert.equal((await readState(c.dir)).review.documents[0].status,'approved');assert.deepEqual(c.state.reviewHistory.slice(0,oldHistory.length),oldHistory);
});


test('supplied input needs no repeated review while authored PRD does in both languages',async t=>{
 for(const language of ['zh-CN','en']) {
  const c=await fixture(t);await c.init({language,documents:[{...c.doc,mode:'input'}]});
  await c.save({reviewHistory:(await approveFixture(c.dir,c.state,[c.doc.path])).slice(0,1)});
  const adopted=await fs.readFile(path.join(c.dir,'status.md'),'utf8');
  assert.match(adopted,language==='zh-CN'?/已采用现有材料/:/Provided material adopted/);
  assert.match(adopted,language==='zh-CN'?/准备好后可说“继续”/:/Say “continue” when ready/);
  assert.doesNotMatch(adopted,/文档已完成，待审核|Document prepared; awaiting review/);
  assert.equal((await readState(c.dir)).review.canProceed,true);
  assert.equal((await readState(c.dir)).review.documents[0].approval,null);
  assert.equal(await fs.readFile(path.join(c.dir,c.doc.path),'utf8'),supplied);
  const authored=await fixture(t);await fs.writeFile(path.join(authored.dir,'prd.md'),await documentFixture('prd'));
  await authored.init({language,goalRef:'prd.md',documentPolicy:{...policy,authority:'authored'},documents:[{kind:'prd',path:'prd.md',mode:'new',version:'1'}],stageRuns:[{...authored.req,outputRefs:['prd.md'],resultRef:'prd.md#requirements'}]});
  await authored.save({reviewHistory:(await approveFixture(authored.dir,authored.state,['prd.md'])).slice(0,1)});
  const created=await fs.readFile(path.join(authored.dir,'status.md'),'utf8');
  assert.match(created,language==='zh-CN'?/文档已完成，待审核/:/Document prepared; awaiting review/);
  assert.doesNotMatch(created,/待确认采用|Awaiting adoption confirmation/);
 }
});
test('approved adopted content is not presented as awaiting adoption again',async t=>{
 const c=await fixture(t);await c.init({reviewHistory:await approveFixture(c.dir,c.input,[c.doc.path])});
 const history=structuredClone(c.state.reviewHistory),saved=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 await run(['render',c.dir,'--revision',String(c.state.revision),'--rules-version',version],{sourceRoot:root});
 const view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');
 assert.match(view,/已批准/);assert.doesNotMatch(view,/待确认采用|请确认采用/);
 const read=await readState(c.dir);assert.equal(read.session.action,'await-continue');assert.deepEqual(read.state.reviewHistory,history);
 assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),saved);
});
test('adoption wording does not conceal requested changes, failed checks or changed content',async t=>{
 const c=await fixture(t);await c.init();const history=await approveFixture(c.dir,c.state,[c.doc.path]);
 await c.save({reviewHistory:[history[0]]});
 await fs.appendFile(path.join(c.dir,c.doc.path),'\nNew business requirement.');
 let view=await renderText(c.dir,c.state);assert.doesNotMatch(view,/待确认采用/);assert.match(view,/材料已变化或缺失/);
 await fs.writeFile(path.join(c.dir,c.doc.path),supplied);
 await c.save({reviewHistory:[...c.state.reviewHistory,{...history[0],id:'failed-check',result:'failed'}]});
 view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(view,/自检失败/);assert.doesNotMatch(view,/待确认采用/);
 await c.save({reviewHistory:[...c.state.reviewHistory,{...history[0],id:'requested-change',kind:'changes-requested',summary:'Synthetic user feedback; amend requirement.'}]});
 view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(view,/需修改/);assert.doesNotMatch(view,/待确认采用/);
 assert.equal((await readState(c.dir)).review.canProceed,false);
});
test('normal render preserves identity and stored next action; wording correction is a normal update, not reinitialization',async t=>{
 const c=await fixture(t);await c.init({next:{action:'是否按标准流程继续？'}});
 await c.save({reviewHistory:(await approveFixture(c.dir,c.state,[c.doc.path])).slice(0,1)});
 const before=await fs.readFile(path.join(c.dir,'.aimship/state.json')),id=c.state.deliveryId,history=structuredClone(c.state.reviewHistory);
 await run(['render',c.dir,'--revision',String(c.state.revision),'--rules-version',version],{sourceRoot:root});
 assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),before);
 assert.match(await fs.readFile(path.join(c.dir,'status.md'),'utf8'),/是否按标准流程继续/);
 await c.save({next:{action:'请确认采用现有 PRD 的范围、业务规则与验收标准作为本次交付依据。'}});
 assert.equal(c.state.deliveryId,id);assert.deepEqual(c.state.reviewHistory,history);
 assert.doesNotMatch(await fs.readFile(path.join(c.dir,'status.md'),'utf8'),/是否按标准流程继续/);
 assert.equal((await readState(c.dir)).review.canProceed,false);
 const saved=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 await assert.rejects(renderState(c.dir,c.state.revision,'different-version',{...runtime,version:'different-version',activeVersion:'different-version'}),{code:'VERSION_MISMATCH'});
 assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),saved);
});
