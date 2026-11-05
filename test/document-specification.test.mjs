import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactMap,definitions,inspectDocuments,sections} from '../lib/documents.mjs';
import {generatedArea,strippedGenerated} from '../lib/projections.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {run} from '../lib/cli.mjs';
import {updateState,recoverState,renderState} from '../lib/state.mjs';
import {nativeDelivery} from '../scripts/testing/native-delivery.mjs';
import {documentFixture} from '../scripts/testing/documents.mjs';
import {listFiles,hash} from '../lib/io.mjs';
import {PROTOCOL_VERSION,upgradeCompatibility} from '../lib/protocol.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sample=path.join(root,'docs/examples/reservation');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const snapshot=async dir=>Object.fromEntries(await Promise.all((await listFiles(dir)).map(async file=>[file,hash(await fs.readFile(path.join(dir,file)))])));
async function detailedDelivery(t){
 const c=await nativeDelivery(t,{initializeOnly:true});
 for(const file of await fs.readdir(sample))await fs.copyFile(path.join(sample,file),path.join(c.dir,file));
 await c.save({documents:[...c.state.documents,{kind:'contract',path:'openapi.yaml',mode:'new',version:'1',assetRefs:['rpc.md']},{kind:'sql',path:'database.sql',mode:'new',version:'1'}],documentPolicy:{authority:'authored',interaction:true,prototypeCovered:false,interface:'http',databases:['main']}});
 return c;
}

test('detailed examples save/read/check/resume with unique case details and one generated current view',async t=>{
 const c=await detailedDelivery(t),map=await artifactMap();
 assert.deepEqual((await inspectDocuments(c.dir,c.state)).issues,[]);
 const cases=definitions(await fs.readFile(path.join(c.dir,'testing.md'),'utf8'),'testing.md',map.documents.testing).filter(d=>d.id.startsWith('TC-'));
 assert.deepEqual(cases.map(d=>d.id),['TC-001','TC-002','TC-003','TC-004']);
 assert.ok(cases.every(d=>d.body.includes('Objective:')),'Index rows cannot replace the actual definitions.');
 const before=await snapshot(c.dir);
 for(const command of ['read','check','resume'])await run([command,c.dir,'--rules-version',c.version],{sourceRoot:root});
 assert.deepEqual(await snapshot(c.dir),before,'Read/check/resume are not repair or migration.');
 for(const kind of ['plan','testing','review'])assert.equal(generatedArea(await fs.readFile(path.join(c.dir,kind+'.md'),'utf8'),kind).count,1);
 for(const [kind,spec] of Object.entries(map.documents)){
  const raw=await fs.readFile(path.join(root,'skills/aimship/references/templates',kind+'.md'),'utf8');
  const h2=sections(raw,spec);assert.ok(h2.every((x,i)=>x.count===1&&(!i||x.start>h2[i-1].start)));
 }
});

test('case index citations in English/Chinese do not hide duplicate detail definitions',async()=>{
 const map=await artifactMap();
 for(const language of ['en','zh-CN']){
  let text=await documentFixture('testing',language);const area=sections(text,map.documents.testing).find(s=>s.id==='cases');
  const details=`\n### 3.1 ${language==='en'?'Case index':'用例索引'}\n\n| TC-001 | Example AC-001 |\n\n### 3.2 TC-001 — Exact assertion\n\nFor AC-001, select two orders and compare each stored total.\n`;
  text=text.slice(0,text.indexOf('\n',area.start)+1)+details+text.slice(area.end);
  assert.equal(definitions(text,'testing.md',map.documents.testing).filter(d=>d.id==='TC-001').length,1);
  const duplicate=text.replace('## '+map.documents.testing.headings[language][3],'### 3.3 TC-001 — Conflicting detail\n\nFor AC-001, return no orders instead.\n\n## '+map.documents.testing.headings[language][3]);
  assert.equal(definitions(duplicate,'testing.md',map.documents.testing).filter(d=>d.id==='TC-001').length,2);
 }
});

test('three semantic revisions preserve detail and history; editorial cleanup carries approval',async t=>{
 const c=await detailedDelivery(t),map=await artifactMap(),reviewed=['prd.md','tech-design.md','openapi.yaml','database.sql','testing.md','plan.md'];
 await c.approve(reviewed);
 const originalIds={};for(const kind of ['prd','plan','testing'])originalIds[kind]=definitions(await fs.readFile(path.join(c.dir,kind+'.md'),'utf8'),kind+'.md',map.documents[kind]).map(d=>d.id);
 const revisions=[
  {summary:'Increase allowed item length from 32 to 48, retaining identity and failure rules.',files:['prd.md','tech-design.md','openapi.yaml','rpc.md','database.sql','testing.md'],change:(s)=>s.replaceAll('1–32','1–48').replaceAll('varchar(32)','varchar(48)').replaceAll('{1,32}','{1,48}').replaceAll('"maxLength": 32','"maxLength": 48').replaceAll('33 characters','49 characters')},
  {summary:'Reduce dispatch selection from 50 to 25; add the explicit limit assertion and task completion.',files:['tech-design.md','rpc.md','testing.md','plan.md'],change:(s,file)=>file==='testing.md'?s.replace('Never publish an uncommitted or rolled-back event.','Never publish an uncommitted or rolled-back event. Also prepare 26 pending events and assert exactly 25 selected in one tick; the remaining event stays pending.'):file==='plan.md'?s.replace('Same event ID reused after ack loss;','At most 25 selected per tick; same event ID reused after ack loss;'):s.replaceAll('50','25')},
  {summary:'Extract session-attempt storage into a named frontend helper and cover logout cleanup.',files:['tech-design.md','testing.md','plan.md'],change:(s,file)=>file==='tech-design.md'?s.replace('| src/holds/api.ts |','| src/holds/sessionAttempt.ts | Save/load/clear scoped attempt | tenant/member + attempt; logout clear | New function used by HoldPage |\n| src/holds/api.ts |').replace('Page --> API[api.createHold]','Page --> Session[sessionAttempt: save load clear]\n  Page --> API[api.createHold]'):file==='plan.md'?s.replace('OutcomePanel.tsx, api.ts','OutcomePanel.tsx, api.ts, sessionAttempt.ts').replace('old responses ignored;','old responses ignored; logout clears only the authenticated attempt;'):s.replace('Record browser steps/screenshots,','After the retained-attempt variant, log out and assert sessionAttempt clears the authenticated attempt and no retry is offered after sign-in. Record browser steps/screenshots,')}
 ];
 for(const [i,r] of revisions.entries()){
  const preserved=path.join(c.dir,'.aimship/evidence',`revision-${i+1}`);await fs.mkdir(preserved,{recursive:true});
  const beforeHistory=structuredClone(c.state.reviewHistory);
  const unaffected=await reviewFingerprint(c.dir,c.state,c.state.documents.find(d=>d.path==='prd.md'));
  for(const file of r.files){const target=path.join(c.dir,file),before=await fs.readFile(target,'utf8');await fs.writeFile(path.join(preserved,file),before);const after=r.change(before,file);assert.notEqual(after,before,file);await fs.writeFile(target,after);}
  const id=`CHG-00${i+1}`,ref=await c.change(id,`${r.summary} Synthetic fixture decision only. Previous exact files: .aimship/evidence/revision-${i+1}. Current sections updated; affected files: ${r.files.join(', ')}. No actual user approval claimed.`);
  const changed=reviewed.filter(file=>r.files.includes(file)||(file==='openapi.yaml'&&r.files.includes('rpc.md')));
  await c.save({documents:c.state.documents.map(d=>changed.includes(d.path)?{...d,version:String(Number(d.version)+1)}:d),operations:[{type:'record-change',change:{id,ref,status:'open',impactRef:ref,affectedRefs:changed}}]});
  assert.deepEqual(c.state.reviewHistory,beforeHistory,'No historical approval is overwritten.');
  const read=await c.read();for(const file of changed)assert.notEqual(read.review.documents.find(d=>d.path===file).status,'approved',file);
  if(i>0){assert.equal(await reviewFingerprint(c.dir,c.state,c.state.documents.find(d=>d.path==='prd.md')),unaffected);assert.equal(read.review.documents.find(d=>d.path==='prd.md').status,'approved');}
  await c.approve(changed);
  for(const kind of ['prd','plan','testing'])assert.deepEqual(definitions(await fs.readFile(path.join(c.dir,kind+'.md'),'utf8'),kind+'.md',map.documents[kind]).map(d=>d.id),originalIds[kind]);
  assert.deepEqual((await inspectDocuments(c.dir,c.state)).issues,[]);
 }
 const tech=await fs.readFile(path.join(c.dir,'tech-design.md'),'utf8'),plan=await fs.readFile(path.join(c.dir,'plan.md'),'utf8'),cases=await fs.readFile(path.join(c.dir,'testing.md'),'utf8');
 assert.doesNotMatch(tech,/varchar\(32\)|limit=50/);assert.match(tech,/varchar\(48\)/);assert.match(tech,/limit=25/);assert.match(plan,/sessionAttempt\.ts/);assert.match(cases,/26 pending events/);assert.match(cases,/### 3\.2\.4 TC-004/);
 assert.match(plan,/Repository \| File\/class\/component \| Concrete change \| Completion criteria/);
 assert.doesNotMatch(tech.split('## 1.')[0],/Latest interpretation|CHG-00/);
 const doc=c.state.documents.find(d=>d.path==='prd.md'),prior=await reviewFingerprint(c.dir,c.state,doc),approvals=c.state.reviewHistory.filter(r=>r.kind==='approved').length;
 await fs.appendFile(path.join(c.dir,'prd.md'),'\n');
 const digest=await reviewFingerprint(c.dir,c.state,doc),base={document:doc.path,version:doc.version,digest,sourceRef:'source/decision.md',summary:'Synthetic editorial check: trailing blank line only.'};
 await c.op({type:'record-review',record:{...base,id:'editorial-check',kind:'self-check',result:'passed'}},{type:'record-review',record:{...base,id:'editorial-carry',kind:'editorial',previousDigest:prior}});
 assert.equal(c.state.reviewHistory.filter(r=>r.kind==='approved').length,approvals);assert.equal((await c.read()).review.documents.find(d=>d.path==='prd.md').status,'approved');
 // Result append and projection rendering retain the detailed approved definitions.
 const before=await fs.readFile(path.join(c.dir,'testing.md'),'utf8'),testingDoc=c.state.documents.find(d=>d.path==='testing.md'),fp=await reviewFingerprint(c.dir,c.state,testingDoc);
 await c.append('testing','runs','### RUN-001 — Synthetic incomplete run\n\nTC-001 first-create variant only; retries not run. Case remains blocked, not passed. This fixture is not actual application execution.');
 await c.save({});await renderState(c.dir,c.state.revision,c.version,c.runtime);
 assert.equal(await reviewFingerprint(c.dir,c.state,testingDoc),fp);assert.ok(strippedGenerated(await fs.readFile(path.join(c.dir,'testing.md'),'utf8'),'testing').includes(strippedGenerated(before,'testing').split('## 5.')[0]));
});

test('exact preview.23 protocol2 fixture is rejected without changing documents, approvals or evidence',async t=>{
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-protocol2-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.cp(path.join(root,'test/fixtures/preview-23'),dir,{recursive:true});const before=await snapshot(dir),state=JSON.parse(await fs.readFile(path.join(dir,'.aimship/state.json'),'utf8'));
 assert.equal(state.protocolVersion,2);assert.equal(state.schemaVersion,5);assert.equal(state.reviewHistory.length,8);
 assert.equal(upgradeCompatibility({version:'0.1.0-preview.23',aimship:{protocolVersion:2}},pkg).status,'breaking');
 for(const cmd of ['read','check','resume','render'])await assert.rejects(run([cmd,dir,'--rules-version',pkg.version,...(cmd==='render'?['--revision',String(state.revision)]:[])],{sourceRoot:root}),{code:'PROTOCOL_MISMATCH'});
 const runtime={version:pkg.version,activeVersion:pkg.version,protocolVersion:PROTOCOL_VERSION};
 await assert.rejects(updateState(dir,{},state.revision,pkg.version,runtime),{code:'PROTOCOL_MISMATCH'});await assert.rejects(recoverState(dir,state.revision,pkg.version,runtime),{code:'PROTOCOL_MISMATCH'});
 assert.deepEqual(await snapshot(dir),before);
});

test('incomplete required combinations remain mixed coverage and cannot close verification',async t=>{
 const c=await nativeDelivery(t,{caseCount:1});
 await c.implement('B-001');await c.review({batchId:'B-001'});await c.review({reviewScope:'overall'});
 const partial=await c.verify({result:'mixed',coverageResults:[{ref:c.caseRefs[0],result:'mixed'}]});
 let read=await c.read();assert.equal(read.execution.verification.passed,false);assert.equal(read.execution.verification.coverage[0].result,'mixed');
 await assert.rejects(c.handoff(),{code:'REVIEW_CHECK'});
 await c.verify({coverageResults:[{ref:c.caseRefs[0],result:'passed'}],historyResultRefs:[partial.resultRef]});
 read=await c.read();assert.equal(read.execution.verification.passed,true);assert.ok(c.state.stageRuns.some(r=>r.id===partial.id&&r.result==='mixed'));
});

test('retained business IDs in permission/error sections remain definitions, not suppressible summaries',async()=>{
 const spec=(await artifactMap()).documents.prd;
 for(const prefix of ['REQ','FR','BR','PERM','EC']){
  const base=await documentFixture('prd','en',false),constraintTitle=spec.headings.en[spec.sections.indexOf('constraints')],requirementTitle=spec.headings.en[spec.sections.indexOf('requirements')];
  const raw=base.replace('## '+constraintTitle,'## '+constraintTitle+`\n\n| ${prefix}-001 | Deny foreign-tenant access with no write. |`);
  assert.equal(definitions(raw,'prd.md',spec).filter(d=>d.id===prefix+'-001').length,1);
  const duplicate=raw.replace('## '+requirementTitle,'## '+requirementTitle+`\n\n| ${prefix}-001 | Conflicting rule that permits foreign-tenant writes. |`);
  assert.equal(definitions(duplicate,'prd.md',spec).filter(d=>d.id===prefix+'-001').length,2);
 }
});

for(const ending of ['LF','CRLF']) test(`numbered case details and duplicate checks preserve ${ending} input`,async t=>{
 const c=await detailedDelivery(t),spec=(await artifactMap()).documents.testing,file=path.join(c.dir,'testing.md');
 const lf=(await fs.readFile(file,'utf8')).replaceAll('\r\n','\n');
 const encode=s=>ending==='CRLF'?s.replaceAll('\n','\r\n'):s;
 const raw=encode(lf);await fs.writeFile(file,raw);
 const records=definitions(raw,'testing.md',spec).filter(d=>d.id.startsWith('TC-'));
 assert.equal(records.length,4);assert.ok(records.every(d=>d.body.includes('Objective:')));
 assert.deepEqual(records.map(d=>({...d,body:d.body.replaceAll('\r','')})),definitions(lf,'testing.md',spec).filter(d=>d.id.startsWith('TC-')));
 assert.deepEqual((await inspectDocuments(c.dir,c.state)).issues,[]);
 for(const area of sections(raw,spec))assert.ok(raw.slice(area.start).startsWith('## '),'Section offsets address the original bytes.');
 const duplicate=encode(lf.replace('## 4. Coverage and verification arrangement','### 3.2.5 TC-001 — Conflicting detail\n\nObjective: create a different hold for the same key.\n\n## 4. Coverage and verification arrangement'));
 await fs.writeFile(file,duplicate);
 assert.equal(definitions(duplicate,'testing.md',spec).filter(d=>d.id==='TC-001').length,2);
 assert.ok((await inspectDocuments(c.dir,c.state)).issues.includes('Duplicate definition TC-001.'));
 assert.equal(await fs.readFile(file,'utf8'),duplicate,'Inspection never rewrites line endings.');
});
