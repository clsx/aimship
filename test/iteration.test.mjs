import { documentFixture } from '../scripts/testing/documents.mjs';
import test from 'node:test';
import { approveFixture } from '../scripts/testing/reviews.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initState, readState, updateState, renderState, checkReferences } from '../lib/state.mjs';
import { scanDeliveries } from '../lib/discovery.mjs';
import { inspectDocuments } from '../lib/documents.mjs';
import { run } from '../lib/cli.mjs';
import { json, hash, exists } from '../lib/io.mjs';
const source=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(source,'package.json'))).version;
const runtime={version,activeVersion:version,dataRoot:await fs.realpath(os.tmpdir())};
const policy={authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]};
const def=(id,refs=[],more={})=>`| ${id} | Synthetic substantive record ${refs.join(', ')}. |`;
async function setup(t,name='delivery') {
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-iteration-'))); t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const dir=path.join(root,name); await fs.mkdir(path.join(dir,'source'),{recursive:true}); await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic commission.');
 await document(dir,'prd',`${def('REQ-001',['AC-001'])}\n${def('AC-001')}\nSynthetic requirement basis: export selected orders within the agreed scope.`);
 return {root,dir,input:{language:'en',goal:{summary:'Synthetic controlled delivery',endpoint:'Design'},goalRef:'prd.md',documentPolicy:policy,documents:[reg('prd')]}};
}
const reg=kind=>({kind,path:`${kind}.md`,mode:'new',version:'1'});
async function document(dir,kind,extra='') {await fs.writeFile(path.join(dir,`${kind}.md`),(await documentFixture(kind,'en',kind!=='prd'))+'\n'+extra+'\n');}
async function init(t, planBasis=false) {
 const f=await setup(t);
 if(planBasis) {
  for(const kind of ['tech-design','testing']) {await document(f.dir,kind);f.input.documents.push(reg(kind));}
  f.input.reviewHistory=await approveFixture(f.dir,f.input,['prd.md','tech-design.md','testing.md']);
 }
 return {...f,state:await initState(f.dir,f.input,version,runtime)};
}

test('ITER AC-01/02: internal layout and generated status are a single stage view',async t=>{
 const {dir,state}=await init(t);
 assert.equal(await exists(path.join(dir,'state.json')),false); assert.equal(state.schemaVersion,4);
 const text=await fs.readFile(path.join(dir,'status.md'),'utf8'); assert.match(text,/State revision: 0/); assert.match(text,/prd.md/); assert.doesNotMatch(text,/TASK-|Installation diagnostics/);
 const s=await updateState(dir,{next:{action:'Blocked on Q in PRD'},outcome:{goal:'not-met'}},0,version,runtime);
 assert.equal(s.writeResult.view.status,'current'); assert.match(await fs.readFile(path.join(dir,'status.md'),'utf8'),/Blocked on Q/);
});
test('ITER AC-03: view write failure saves revision; reads do not repair; render does not replay',async t=>{
 const {dir}=await init(t); await fs.rm(path.join(dir,'status.md')); await fs.mkdir(path.join(dir,'status.md'));
 const saved=await updateState(dir,{next:{action:'Saved once'}},0,version,runtime);
 assert.equal(saved.revision,1); assert.equal(saved.writeResult.stateSaved,true); assert.equal(saved.writeResult.view.status,'protected');
 const before=await fs.readFile(path.join(dir,'.aimship/state.json'),'utf8');
 for(const cmd of ['read','check','resume']) await run([cmd,dir,'--rules-version',version],{sourceRoot:source});
 assert.equal(await fs.readFile(path.join(dir,'.aimship/state.json'),'utf8'),before); assert.ok((await fs.stat(path.join(dir,'status.md'))).isDirectory());
 await fs.rm(path.join(dir,'status.md'),{recursive:true});
 assert.equal((await renderState(dir,1,version,runtime)).view.status,'current'); assert.equal((await readState(dir)).state.revision,1);
 await assert.rejects(updateState(dir,{},0,version,runtime),{code:'REVISION_CONFLICT'});
 // Failure after replacing the view but before writing metadata is also recoverable.
 await fs.rm(path.join(dir,'status.md')); await fs.rm(path.join(dir,'.aimship/view.json')); await fs.mkdir(path.join(dir,'.aimship/view.json'));
 const second=await updateState(dir,{next:{action:'Second saved intent'}},1,version,runtime); assert.equal(second.revision,2); assert.equal(second.writeResult.view.status,'error');
 await fs.rm(path.join(dir,'.aimship/view.json'),{recursive:true});
 assert.equal((await renderState(dir,2,version,runtime,true)).view.status,'current');
});
test('ITER AC-03/06: hand edits survive and do not confer acceptance; external plan edits invalidate readiness',async t=>{
 const {dir,state}=await init(t); const edit='User annotation: accepted and deploy now'; await fs.appendFile(path.join(dir,'status.md'),edit);
 const saved=await updateState(dir,{next:{action:'Continue current scope'}},0,version,runtime); assert.equal(saved.writeResult.view.status,'protected'); assert.equal(saved.outcome.acceptance,'not-recorded');
 const repaired=await renderState(dir,1,version,runtime,true); assert.match(await fs.readFile(repaired.view.preservedPath,'utf8'),/deploy now/);
 await document(dir,'plan'); await updateState(dir,{documents:[...state.documents,reg('plan')]},1,version,runtime);
 await fs.appendFile(path.join(dir,'plan.md'),'Actual TASK completed before state save.'); await fs.appendFile(path.join(dir,'prd.md'),'A new requirement awaiting impact assessment.');
 const resumed=await run(['resume',dir,'--rules-version',version],{sourceRoot:source}); assert.equal(resumed.data.canProceed,false); assert.deepEqual(resumed.data.documentChanges.sort(),['plan.md','prd.md']); assert.equal(resumed.data.view.status,'current');
});
test('ITER AC-04/14: required plan, shared sections and exact result locators are enforced',async t=>{
 const {dir,state}=await init(t,true); await document(dir,'plan');
 const implement={id:'i1',stage:'implement',scope:'batch',progress:'active',inputRefs:['prd.md'],outputRefs:['plan.md']};
 await assert.rejects(updateState(dir,{documents:[...state.documents,reg('plan')],stageRuns:[implement]},0,version,runtime),{code:'DOCUMENT_CHECK'});
 const plan={id:'p1',stage:'plan',scope:'all',progress:'done',inputRefs:['prd.md'],outputRefs:['plan.md'],resultRef:'plan.md#tasks'};
 const s=await updateState(dir,{documents:[...state.documents,reg('plan')],stageRuns:[plan,{...implement,progress:'planned'}]},0,version,runtime);
 assert.equal(s.stageRuns[1].progress,'planned');
 await updateState(dir,{reviewHistory:await approveFixture(dir,s,['plan.md']),stageRuns:[plan,{...implement,progress:'done',resultRef:'plan.md#execution'}]},1,version,runtime);
 await assert.rejects(updateState(dir,{stageRuns:[plan,{...implement,progress:'done',resultRef:'plan.md#absent',priorResultRef:'plan.md#execution'}]},2,version,runtime),{code:'DOCUMENT_CHECK'});
 await fs.rename(path.join(dir,'plan.md'),path.join(dir,'implementation.md'));
 assert.ok((await inspectDocuments(dir,(await readState(dir)).state)).issues.some(x=>x.includes('plan.md')));
});
test('ITER AC-11/13/16/19: authored/adopted branches, SQL targets, localized headings and reused limits',async t=>{
 for(const [authority,interaction,covered] of [['adopted',true,true],['adopted',true,false],['authored',true,false],['authored',false,false],['authored',true,false]]) {
  const f=await setup(t,`${authority}-${covered}`),kind='prd';
  const s=await initState(f.dir,{...f.input,goalRef:`${kind}.md`,documentPolicy:{...policy,authority,interaction,prototypeCovered:covered},documents:[reg(kind)]},version,runtime);assert.equal(s.goalRef,`${kind}.md`);assert.equal(s.stageRuns.length,0);
 }
 const {dir,input}=await setup(t); await document(dir,'tech-design'); await fs.writeFile(path.join(dir,'database-main.sql'),'-- target main; sqlite; schema v1; not executed\nCREATE TABLE sample(id INTEGER);');await fs.writeFile(path.join(dir,'database-audit.sql'),'-- target audit; sqlite; not executed\nCREATE TABLE log(id INTEGER);');
 const run={id:'d1',stage:'tech-design',scope:'two databases',progress:'done',inputRefs:['prd.md'],outputRefs:['tech-design.md'],resultRef:'tech-design.md#coverage'};
 const s=await initState(dir,{...input,reviewHistory:await approveFixture(dir,input,['prd.md']),documentPolicy:{...policy,databases:['main','audit']},documents:[...input.documents,reg('tech-design'),...['main','audit'].map(id=>({kind:'sql',path:`database-${id}.sql`,mode:'new',version:'1'}))],stageRuns:[run]},version,runtime);
 assert.equal(s.stageRuns[0].progress,'done');await fs.rm(path.join(dir,'database-audit.sql'));assert.ok((await inspectDocuments(dir,s)).issues.some(x=>x.includes('database-audit.sql')));
 const text=await fs.readFile(path.join(dir,'prd.md'),'utf8');await fs.writeFile(path.join(dir,'prd.md'),text.replace('## Acceptance criteria','## 验收标准'));
 assert.equal((await checkReferences(dir,{...s,goalRef:'prd.md#acceptance'}))[0].fragmentChecked,true);
 const refs=await checkReferences(dir,{...s,goalRef:'https://example.invalid/source#page'});assert.equal(refs[0].status,'not-checked');
});

test('ITER completion section and repository status links remain unambiguous',async t=>{
 const {root,dir,state}=await init(t,true);await document(dir,'plan');
 const plan={id:'plan',stage:'plan',scope:'before implementation',progress:'done',inputRefs:['prd.md'],outputRefs:['plan.md'],resultRef:'plan.md#tasks'};
 await updateState(dir,{documents:[...state.documents,reg('plan')],stageRuns:[plan]},0,version,runtime);
 await assert.rejects(updateState(dir,{stageRuns:[plan,{id:'implement',stage:'implement',scope:'batch',progress:'done',inputRefs:['plan.md'],outputRefs:['plan.md'],resultRef:'plan.md#tasks'}]},1,version,runtime),{code:'DOCUMENT_CHECK'});
 const repo=path.join(root,'repo with space');await fs.mkdir(repo);await fs.writeFile(path.join(repo,'api.yaml'),'openapi: 3.1.0');
 const saved=await updateState(dir,{repositories:[{id:'api',path:repo,role:'read-only contract'}],documents:[...state.documents,reg('plan'),{kind:'contract',path:'repo:api/api.yaml',mode:'reused',version:'1',basisRef:'prd.md#scope'}]},1,version,runtime);
 assert.equal(saved.writeResult.view.status,'current');const view=await fs.readFile(path.join(dir,'status.md'),'utf8');assert.ok(view.includes(encodeURI(path.join(repo,'api.yaml'))));assert.ok(!view.includes('](repo:'));

});


test('review: every completed review remains locatable after later document edits',async t=>{
 const {dir,input}=await setup(t);await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic explicit independent review-only commission, not standard development.');
 const state=await initState(dir,{...input,deliveryPolicy:{version:1,partialRef:'source/request.md'}},version,runtime);await document(dir,'review',`${def('REV-001',[],{run:'r1'})}`);
 await updateState(dir,{documents:[...state.documents,reg('review')],stageRuns:[{id:'r1',stage:'review',scope:'whole',progress:'done',inputRefs:['prd.md'],outputRefs:['review.md'],resultRef:'review.md#REV-001'}]},0,version,runtime);
 const file=path.join(dir,'review.md');await fs.writeFile(file,(await fs.readFile(file,'utf8')).replace(def('REV-001',[],{run:'r1'}),''));
 await assert.rejects(updateState(dir,{},1,version,runtime),{code:'DOCUMENT_CHECK'});
 assert.equal((await readState(dir)).state.revision,1);
 const resumed=await run(['resume',dir,'--rules-version',version],{sourceRoot:source});assert.equal(resumed.data.canProceed,false);
 assert.ok(resumed.data.documents.issues.some(x=>x.includes('REV-001')));
 await fs.appendFile(file,def('REV-001',[],{run:'r1'}));
 await fs.writeFile(file,(await fs.readFile(file,'utf8')).replace(def('REV-001',[],{run:'r1'}),''));
 await fs.appendFile(path.join(dir,'prd.md'),def('REV-001',[],{run:'r1'}));
 await assert.rejects(updateState(dir,{},1,version,runtime),{code:'DOCUMENT_CHECK'});
});



test('review: a generated page from a different delivery cannot be current at the same revision',async t=>{
 const a=await init(t),b=await init(t);
 await fs.copyFile(path.join(a.dir,'status.md'),path.join(b.dir,'status.md'));
 await fs.copyFile(path.join(a.dir,'.aimship/view.json'),path.join(b.dir,'.aimship/view.json'));
 assert.equal((await readState(b.dir)).view.status,'stale');
 assert.equal((await run(['resume',b.dir,'--rules-version',version],{sourceRoot:source})).data.canProceed,false);
 await renderState(b.dir,0,version,runtime);assert.match(await fs.readFile(path.join(b.dir,'status.md'),'utf8'),new RegExp(b.state.deliveryId));
});

test('review: unreadable or remote content cannot bypass new artifact location rules',async t=>{
 const {dir,input}=await setup(t);
 await assert.rejects(initState(dir,{...input,documents:[{...reg('prd'),path:'https://example.invalid/prd.md'}]},version,runtime),{code:'DOCUMENT_CHECK'});
 await fs.writeFile(path.join(dir,'sketch.svg'),'<svg/>');
 await assert.rejects(initState(dir,{...input,documents:[...input.documents,{kind:'prototype',path:'sketch.svg',mode:'new',version:'1'}]},version,runtime),{code:'DOCUMENT_CHECK'});
 const state=await initState(dir,{...input,documents:[...input.documents,{kind:'prototype',path:'sketch.svg',mode:'reused',version:'1',basisRef:'prd.md#scope'}]},version,runtime);
 assert.equal(state.revision,0);
});
