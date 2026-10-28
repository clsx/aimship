import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { artifactMap, definitions, hasLocator, inspectDocuments } from '../lib/documents.mjs';
import { initState, updateState, readState, checkReferences, renderState, recoverState } from '../lib/state.mjs';
import { reviewFingerprint, reviewStatus } from '../lib/approvals.mjs';
import { scanDeliveries } from '../lib/discovery.mjs';
import { documentFixture } from '../scripts/testing/documents.mjs';
import { approveFixture } from '../scripts/testing/reviews.mjs';
const version=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url))).version;
const runtime={version,activeVersion:version,dataRoot:await fs.realpath(os.tmpdir())};
const reg=kind=>({kind,path:`${kind}.md`,mode:'new',version:'1'});
async function setup(t,language='en') {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-plain-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic request: export two selected orders, with exact totals.');
 await fs.writeFile(path.join(dir,'prd.md'),await documentFixture('prd',language));
 const input={language,goal:{summary:'Export selected orders',endpoint:'Local verified implementation'},goalRef:'prd.md',documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:[reg('prd')]};
 const state=await initState(dir,input,version,runtime);return {dir,state,input};
}
test('plain Markdown: both languages complete requirements without HTML, metadata or sidecar',async t=>{
 for(const language of ['en','zh-CN']) {
  const c=await setup(t,language);const body=await fs.readFile(path.join(c.dir,'prd.md'),'utf8');assert.doesNotMatch(body,/<a |aimship:def/);
  const stageRuns=[{id:'requirements',stage:'requirements',scope:'Selected orders',progress:'done',inputRefs:['source/request.md'],outputRefs:['prd.md'],resultRef:'prd.md#requirements'}];
  const state=await updateState(c.dir,{stageRuns,currentRun:'requirements'},0,version,runtime);
  assert.equal(state.schemaVersion,4);
  assert.equal((await checkReferences(c.dir,state,true)).find(r=>r.ref==='prd.md#requirements').status,'exists');
  assert.ok((await readState(c.dir)).review.pending.length);assert.deepEqual((await inspectDocuments(c.dir,state)).issues,[]);
  assert.deepEqual((await fs.readdir(path.join(c.dir,'.aimship'))).sort(),['state.json','state.previous.json','view.json']);
 }
});
test('plain numbers: cross-document references, duplicate/missing references and blank obligations',async t=>{
 const c=await setup(t);await fs.writeFile(path.join(c.dir,'testing.md'),await documentFixture('testing'));
 const state=await updateState(c.dir,{documents:[...c.state.documents,reg('testing')]},0,version,runtime);assert.deepEqual((await inspectDocuments(c.dir,state)).issues,[]);
 const file=path.join(c.dir,'testing.md'),original=await fs.readFile(file,'utf8');
 for(const [text,expected] of [[original+'\n| TC-001 | Duplicate case for AC-001. |','Duplicate definition'],[original.replace('AC-001','AC-999'),'undefined reference'],[original.replace(/\| TC-001[^\n]*/,'| TC-001 | TBD |'),'placeholder']]) {
  await fs.writeFile(file,text);await assert.rejects(updateState(c.dir,{},state.revision,version,runtime),e=>e.code==='DOCUMENT_CHECK' && JSON.stringify(e.details).includes(expected));
 }
 await fs.writeFile(file,original);assert.equal((await readState(c.dir)).state.revision,1);
});
test('empty documents, template-only completion and example-only IDs cannot pass requirements checks',async t=>{
 const c=await setup(t);const file=path.join(c.dir,'prd.md'),raw=await fs.readFile(file,'utf8');
 const run={id:'req',stage:'requirements',scope:'Orders',progress:'done',inputRefs:[],outputRefs:['prd.md'],resultRef:'prd.md#requirements'};
 for(const body of ['',await documentFixture('prd','en',false),raw.replace(/\| (?:REQ|AC)-001[^\n]*/g,'')+'\n```markdown\n| REQ-001 | Example AC-001 |\n| AC-001 | Example REQ-001 |\n```',await fs.readFile(new URL('../skills/aimship/references/templates/prd.md',import.meta.url),'utf8')]) {
  await fs.writeFile(file,body);await assert.rejects(updateState(c.dir,{stageRuns:[run]},0,version,runtime),{code:'DOCUMENT_CHECK'});
 }
});
test('plain parser ignores fenced examples/comments/quotes and locates only unique headings or numbered records',()=>{
 const body='## Results\n\n| RUN-001 | Checked the selected orders. |\n\n```md\n## Results\n| RUN-999 | Example only. |\n```\n<!-- REQ-999 -->\n> | TC-999 | quotation |';
 assert.equal(hasLocator(body,'Results'),true);assert.equal(hasLocator(body,'RUN-001'),true);assert.equal(hasLocator(body,'RUN-999'),false);assert.equal(definitions(body,'x').length,1);
 assert.equal(hasLocator(body+'\n## Results\nAnother section.','Results'),false);
});
test('approval boundaries: result append retains design approval; changed design and broken headings do not',async t=>{
 const c=await setup(t);const map=await artifactMap();
 for(const kind of ['plan','testing']) {
  const file=path.join(c.dir,`${kind}.md`),raw=await documentFixture(kind);await fs.writeFile(file,raw);const doc=reg(kind),state={...c.state,documents:[...c.state.documents,doc]};
  const before=await reviewFingerprint(c.dir,state,doc);await fs.appendFile(file,'\nObserved synthetic execution result: passed.');assert.equal(await reviewFingerprint(c.dir,state,doc),before);
  await fs.writeFile(file,raw.replace('Synthetic basis','Changed basis'));assert.notEqual(await reviewFingerprint(c.dir,state,doc),before);
  const key=kind==='plan'?'execution':'runs',idx=map.documents[kind].sections.indexOf(key),title=map.documents[kind].headings.en[idx];
  for(const broken of [raw.replace('## '+title,'### '+title),raw+'\n## '+title+'\nExtra boundary.']) {await fs.writeFile(file,broken);assert.equal(await reviewFingerprint(c.dir,state,doc),null);}
 }
 const history=await approveFixture(c.dir,c.state,['prd.md']);const approved=await updateState(c.dir,{reviewHistory:history},0,version,runtime);assert.equal((await reviewStatus(c.dir,approved)).documents[0].status,'approved');
 await fs.appendFile(path.join(c.dir,'prd.md'),'\nA material requirement change.');assert.notEqual((await reviewStatus(c.dir,approved)).documents[0].status,'approved');await assert.rejects(updateState(c.dir,{},1,version,runtime),{code:'REVIEW_CHECK'});
});


test('omitting producer records does not permit approval of a requirements template',async t=>{
 const c=await setup(t);await fs.writeFile(path.join(c.dir,'prd.md'),await documentFixture('prd','en',false));
 const reviewHistory=await approveFixture(c.dir,c.state,['prd.md']);
 await assert.rejects(updateState(c.dir,{reviewHistory},0,version,runtime),e=>e.code==='DOCUMENT_CHECK' && e.details.issues.some(i=>i.includes('REQ records')));
});
test('design records cannot be moved or added in excluded execution sections',async t=>{
 const c=await setup(t);const map=await artifactMap();
 for(const [kind,prefix] of [['plan','TASK'],['testing','TC']]) {
  const raw=await documentFixture(kind),file=path.join(c.dir,`${kind}.md`),doc=reg(kind),state={...c.state,documents:[...c.state.documents,doc]};
  await fs.writeFile(file,raw);const fingerprint=await reviewFingerprint(c.dir,state,doc);
  const moved=raw.replace(new RegExp('\\| '+prefix+'-001[^\\n]*'),'')+'\n| '+prefix+'-001 | Moved obligation referencing REQ-001 and AC-001. |';
  await fs.writeFile(file,moved);assert.ok((await inspectDocuments(c.dir,state)).issues.some(i=>i.includes('not execution records')));
  await fs.writeFile(file,raw+'\n| '+prefix+'-002 | New unreviewed obligation for AC-001. |');
  assert.equal(await reviewFingerprint(c.dir,state,doc),fingerprint);assert.ok((await inspectDocuments(c.dir,state)).issues.some(i=>i.includes('not execution records')));
 }
});

test('ordinary numbered headings and bullets carry their following explanation; prose citations are not new definitions',()=>{
 const body='### REQ-001\n\nExport selected orders and validate exact totals with AC-001.\n\n### AC-001\n\nFor REQ-001, the exported totals match the selected orders.\n\n## Notes\nREQ-001 is referenced here.\n- TC-001\n  Select two orders and compare their totals against AC-001.\n';
 const records=definitions(body,'prd.md');assert.deepEqual(records.map(r=>r.id),['REQ-001','AC-001','TC-001']);assert.ok(records[0].body.includes('exact totals'));assert.equal(hasLocator(body,'REQ-001'),true);
});


test('cross-document coverage tables cite existing numbers without redefining their owning records',async t=>{
 const c=await setup(t);await fs.writeFile(path.join(c.dir,'tech-design.md'),await documentFixture('tech-design')+'\n| REQ-001 | Architecture addresses the exported order totals. |\n| AC-001 | The output count and totals are compared. |');
 await fs.appendFile(path.join(c.dir,'prd.md'),'\n| PAGE-001 | The order-selection page presents REQ-001. |');
 const state={...c.state,documents:[...c.state.documents,reg('tech-design')]};assert.deepEqual((await inspectDocuments(c.dir,state)).issues,[]);
 await fs.appendFile(path.join(c.dir,'tech-design.md'),'\n| REQ-999 | This obligation has no requirement definition. |');assert.ok((await inspectDocuments(c.dir,state)).issues.some(i=>i.includes('undefined reference REQ-999')));
});
