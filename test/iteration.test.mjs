import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initState, readState, updateState, renderState, checkReferences } from '../lib/state.mjs';
import { migrateState, scanDeliveries } from '../lib/migrate.mjs';
import { inspectDocuments } from '../lib/documents.mjs';
import { run } from '../lib/cli.mjs';
import { json, hash, exists } from '../lib/io.mjs';
const source=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(source,'package.json'))).version;
const runtime={version,activeVersion:version};
const policy={authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]};
const def=(id,refs=[],more={})=>`<!-- aimship:def ${JSON.stringify({id,version:1,status:'current',refs,...more})} -->`;
async function setup(t,name='delivery') {
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-iteration-'))); t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const dir=path.join(root,name); await fs.mkdir(path.join(dir,'source'),{recursive:true}); await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic commission.');
 await document(dir,'prd',`${def('REQ-001',['local:AC-001@1'])}\n${def('AC-001')}`);
 return {root,dir,input:{goal:{summary:'Synthetic controlled delivery',endpoint:'Design'},goalRef:'prd.md',documentPolicy:policy,documents:[reg('prd')]}};
}
const reg=kind=>({kind,path:`${kind}.md`,mode:'new',version:'1'});
async function document(dir,kind,extra='') {await fs.writeFile(path.join(dir,`${kind}.md`),(await fs.readFile(path.join(source,`skills/aimship/references/templates/${kind}.md`),'utf8'))+'\n'+extra+'\n');}
async function init(t) {const f=await setup(t); return {...f,state:await initState(f.dir,f.input,version,runtime)};}

test('ITER AC-01/02: internal layout and generated status are a single stage view',async t=>{
 const {dir,state}=await init(t);
 assert.equal(await exists(path.join(dir,'state.json')),false); assert.equal(state.schemaVersion,2);
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
test('ITER AC-04/14: required plan, shared sections and exact result anchors are enforced',async t=>{
 const {dir,state}=await init(t); await document(dir,'plan');
 const implement={id:'i1',stage:'implement',scope:'batch',progress:'active',inputRefs:['prd.md'],outputRefs:['plan.md']};
 await assert.rejects(updateState(dir,{documents:[...state.documents,reg('plan')],stageRuns:[implement]},0,version,runtime),{code:'DOCUMENT_CHECK'});
 const plan={id:'p1',stage:'plan',scope:'all',progress:'done',inputRefs:['prd.md'],outputRefs:['plan.md'],resultRef:'plan.md#tasks'};
 const s=await updateState(dir,{documents:[...state.documents,reg('plan')],stageRuns:[plan,{...implement,progress:'planned'}]},0,version,runtime);
 assert.equal(s.stageRuns[1].progress,'planned');
 await updateState(dir,{stageRuns:[plan,{...implement,progress:'done',resultRef:'plan.md#execution'}]},1,version,runtime);
 await assert.rejects(updateState(dir,{stageRuns:[plan,{...implement,progress:'done',resultRef:'plan.md#absent',priorResultRef:'plan.md#execution'}]},2,version,runtime),{code:'DOCUMENT_CHECK'});
 await fs.rename(path.join(dir,'plan.md'),path.join(dir,'implementation.md'));
 assert.ok((await inspectDocuments(dir,(await readState(dir)).state)).issues.some(x=>x.includes('plan.md')));
});
test('ITER AC-14/17: namespace/version identities, coverage, retirement, duplicate and history checks',async t=>{
 const {dir,state}=await init(t);
 await fs.appendFile(path.join(dir,'prd.md'),`\n${def('REQ-009',[],{status:'retired'})}\n${def('REQ-001',[],{namespace:'source-v1'})}\n${def('TC-001',['local:AC-001@1'],{status:'historical'})}\n${def('TC-001',['local:AC-001@1'],{version:2})}`);
 const s=await updateState(dir,{},0,version,runtime); const report=await inspectDocuments(dir,s); assert.equal(report.nextIds['local:REQ'],10); assert.deepEqual(report.issues,[]);
 const raw=await fs.readFile(path.join(dir,'prd.md'),'utf8'); await fs.appendFile(path.join(dir,'prd.md'),'\n'+def('REQ-001',['local:AC-001@1']));
 await assert.rejects(updateState(dir,{},1,version,runtime),{code:'DOCUMENT_CHECK'});
 await fs.writeFile(path.join(dir,'prd.md'),raw.replace(def('REQ-009',[],{status:'retired'}),def('REQ-009',['local:AC-001@1'])));
 await assert.rejects(updateState(dir,{},1,version,runtime),{code:'DOCUMENT_CHECK'});
 await fs.writeFile(path.join(dir,'prd.md'),raw.replace(def('REQ-009',[],{status:'retired'}),''));
 await assert.rejects(updateState(dir,{},1,version,runtime),{code:'DOCUMENT_CHECK'});
 await fs.writeFile(path.join(dir,'prd.md'),raw+'\n'+def('TASK-001',['local:REQ-999@1']));
 assert.ok((await inspectDocuments(dir,state)).issues.some(x=>x.includes('unresolved')));
});
async function legacy(dir,input) {
 const s={...input,cycle:1,closureRefs:[],stageRuns:[],currentRun:null,openChanges:[],repositories:[],outcome:{goal:'in-progress',acceptance:'not-recorded'},next:{action:'Continue original scope'},schemaVersion:1,revision:3,deliveryId:'legacy-example',rulesVersion:'0.1.0-preview.4'};
 delete s.documents; delete s.documentPolicy; await fs.writeFile(path.join(dir,'state.json'),json(s)); return s;
}
test('ITER AC-09/15: migrate then adopt; mixed roots deduplicate; unknown and dual layouts stay preserved',async t=>{
 const {root,dir,input}=await setup(t); const old=await legacy(dir,input); const bytes=await fs.readFile(path.join(dir,'state.json'),'utf8');
 await assert.rejects(updateState(dir,{compatibilityRef:'prd.md'},3,version,runtime,'adopt'),{code:'MIGRATION_REQUIRED'});
 const migrated=await migrateState(dir,3,version,runtime,{compatibilityRef:'prd.md'}); assert.equal(migrated.rulesVersion,old.rulesVersion); assert.equal(migrated.deliveryId,old.deliveryId); assert.equal(migrated.revision,4); assert.equal(await exists(path.join(dir,'state.json')),false);
 assert.equal(await fs.readFile(path.join(dir,'.aimship/legacy/state.json'),'utf8'),bytes);
 const adopted=await updateState(dir,{compatibilityRef:'prd.md'},4,version,runtime,'adopt'); assert.equal(adopted.rulesVersion,version); assert.deepEqual(adopted.stageRuns,[]);
 await assert.rejects(updateState(dir,{stageRuns:[{id:'new',stage:'frame',scope:'new work',progress:'active',inputRefs:['prd.md'],outputRefs:[]}]},5,version,runtime),{code:'INVALID_STATE'});
 assert.equal((await run(['resume',dir,'--rules-version',version],{sourceRoot:source})).data.canProceed,false);
 const copy=path.join(root,'duplicate');await fs.cp(dir,copy,{recursive:true});
 const oldDir=path.join(root,'old-active');await fs.mkdir(oldDir);await fs.writeFile(path.join(oldDir,'state.json'),json({...old,deliveryId:'other'}));
 const scan=await scanDeliveries(root);assert.equal(scan.records.length,2);assert.equal(scan.issues[0].reason,'duplicate-delivery-id');
 await fs.writeFile(path.join(dir,'state.json'),bytes);assert.equal((await readState(dir)).conflict,true);await assert.rejects(updateState(dir,{},5,version,runtime),{code:'LAYOUT_CONFLICT'});
 const future=path.join(root,'future');await fs.mkdir(future);await fs.writeFile(path.join(future,'state.json'),json({schemaVersion:99,opaque:'keep'}));assert.equal((await readState(future)).readOnly,true);
 await assert.rejects(migrateState(future,0,version,runtime,{compatibilityRef:'prd.md'}),{code:'UNKNOWN_SCHEMA'});
});
test('ITER AC-09: migration interrupted after target save resumes, while changed source is protected',async t=>{
 const {dir,input}=await setup(t);await legacy(dir,input);const raw=await fs.readFile(path.join(dir,'state.json'),'utf8');
 await migrateState(dir,3,version,runtime,{compatibilityRef:'prd.md'});
 const journalPath=path.join(dir,'.aimship/migration.json');const j=JSON.parse(await fs.readFile(journalPath));j.status='prepared';await fs.writeFile(journalPath,json(j));await fs.writeFile(path.join(dir,'state.json'),raw);
 await fs.appendFile(path.join(dir,'state.json'),' ');await assert.rejects(migrateState(dir,3,version,runtime,{compatibilityRef:'prd.md'}),{code:'MIGRATION_CONFLICT'});assert.equal(hash(await fs.readFile(path.join(dir,'.aimship/state.json'))),j.targetHash);
 await fs.writeFile(path.join(dir,'state.json'),raw);const resumed=await migrateState(dir,3,version,runtime,{compatibilityRef:'prd.md'});assert.equal(resumed.revision,4);assert.equal(await exists(path.join(dir,'state.json')),false);
});
test('ITER AC-11/13/16/19: authored/adopted branches, SQL targets, localized anchors and reused limits',async t=>{
 for(const [authority,interaction,covered] of [['adopted',true,true],['adopted',true,false],['authored',true,false],['authored',false,false],['authored',true,false]]) {
  const f=await setup(t,`${authority}-${covered}`),kind=authority==='adopted'?'scope':'prd'; if(kind==='scope'){await document(f.dir,kind);await fs.rm(path.join(f.dir,'prd.md'));}
  const s=await initState(f.dir,{...f.input,goalRef:`${kind}.md`,documentPolicy:{...policy,authority,interaction,prototypeCovered:covered},documents:[reg(kind)]},version,runtime);assert.equal(s.goalRef,`${kind}.md`);assert.equal(s.stageRuns.length,0);
 }
 const {dir,input}=await setup(t); await document(dir,'tech-design'); await fs.writeFile(path.join(dir,'database-main.sql'),'-- target main; sqlite; schema v1; not executed\nCREATE TABLE sample(id INTEGER);');await fs.writeFile(path.join(dir,'database-audit.sql'),'-- target audit; sqlite; not executed\nCREATE TABLE log(id INTEGER);');
 const run={id:'d1',stage:'tech-design',scope:'two databases',progress:'done',inputRefs:['prd.md'],outputRefs:['tech-design.md'],resultRef:'tech-design.md#coverage'};
 const s=await initState(dir,{...input,documentPolicy:{...policy,databases:['main','audit']},documents:[...input.documents,reg('tech-design'),...['main','audit'].map(id=>({kind:'sql',path:`database-${id}.sql`,mode:'new',version:'1'}))],stageRuns:[run]},version,runtime);
 assert.equal(s.stageRuns[0].progress,'done');await fs.rm(path.join(dir,'database-audit.sql'));assert.ok((await inspectDocuments(dir,s)).issues.some(x=>x.includes('database-audit.sql')));
 const text=await fs.readFile(path.join(dir,'prd.md'),'utf8');await fs.writeFile(path.join(dir,'prd.md'),text.replace('## Acceptance criteria','## 验收标准'));
 assert.equal((await checkReferences(dir,{...s,goalRef:'prd.md#acceptance'}))[0].fragmentChecked,true);
 const refs=await checkReferences(dir,{...s,goalRef:'https://example.invalid/source#page'});assert.equal(refs[0].status,'not-checked');
});

test('ITER completion section and repository status links remain unambiguous',async t=>{
 const {root,dir,state}=await init(t);await document(dir,'plan');
 const plan={id:'plan',stage:'plan',scope:'before implementation',progress:'done',inputRefs:['prd.md'],outputRefs:['plan.md'],resultRef:'plan.md#tasks'};
 await updateState(dir,{documents:[...state.documents,reg('plan')],stageRuns:[plan]},0,version,runtime);
 await assert.rejects(updateState(dir,{stageRuns:[plan,{id:'implement',stage:'implement',scope:'batch',progress:'done',inputRefs:['plan.md'],outputRefs:['plan.md'],resultRef:'plan.md#tasks'}]},1,version,runtime),{code:'DOCUMENT_CHECK'});
 const repo=path.join(root,'repo with space');await fs.mkdir(repo);await fs.writeFile(path.join(repo,'api.yaml'),'openapi: 3.1.0');
 const saved=await updateState(dir,{repositories:[{id:'api',path:repo,role:'read-only contract'}],documents:[...state.documents,reg('plan'),{kind:'contract',path:'repo:api/api.yaml',mode:'reused',version:'1',basisRef:'prd.md#scope'}]},1,version,runtime);
 assert.equal(saved.writeResult.view.status,'current');const view=await fs.readFile(path.join(dir,'status.md'),'utf8');assert.ok(view.includes(encodeURI(path.join(repo,'api.yaml'))));assert.ok(!view.includes('](repo:'));
 const raw=await fs.readFile(path.join(dir,'.aimship/state.json'));await fs.rename(path.join(dir,'.aimship/state.json'),path.join(dir,'state.json'));
 assert.equal((await readState(dir)).layoutMismatch,true);await assert.rejects(updateState(dir,{},2,version,runtime),{code:'LAYOUT_CONFLICT'});assert.deepEqual(await fs.readFile(path.join(dir,'state.json')),raw);
});

test('ITER malformed definition metadata cannot silently disappear from checks',async t=>{
 const {dir}=await init(t);await fs.appendFile(path.join(dir,'prd.md'),'\n<!-- aimship:def invalid-json -->\n');
 await assert.rejects(updateState(dir,{},0,version,runtime),{code:'DOCUMENT_METADATA'});
 assert.equal((await readState(dir)).state.revision,0);
});
