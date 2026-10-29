import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run} from '../lib/cli.mjs';
import {artifactMap, hasLocator} from '../lib/documents.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {documentFixture} from '../scripts/testing/documents.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
const sourceRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(sourceRoot,'package.json'))).version;
const reg=kind=>({kind,path:kind+'.md',mode:'new',version:'1'});
async function fixture(t,language='en') {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-readable-')));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));
 await fs.writeFile(path.join(dir,'source/request.md'),'Synthetic review: explicitly use this isolated directory for selected-order export.');
 for(const kind of ['prd','testing','plan'])await fs.writeFile(path.join(dir,kind+'.md'),await documentFixture(kind,language));
 let state;
 const call=async(command,input)=>{
  const args=[command,dir,'--rules-version',version];
  if(input!==undefined){const file=path.join(dir,'input.json');await fs.writeFile(file,JSON.stringify(input));args.push('--input',file);if(command==='update')args.push('--revision',String(state.revision));}
  const result=await run(args,{sourceRoot});if(['init','update'].includes(command))state=result.data;return result.data;
 };
 const input={language,storage:{mode:'explicit',decisionRef:'source/request.md'},goal:{summary:'Selected-order export',endpoint:'Reviewed local design'},goalRef:'prd.md',documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:['prd','testing','plan'].map(reg)};
 return {dir,call,input,get state(){return state;},put:(file,body)=>fs.writeFile(path.join(dir,file),body)};
}
test('ordinary references in summaries, coverage and execution keep one definition in both languages',async t=>{
 const map=await artifactMap();
 for(const lang of ['en','zh-CN']) {
  const c=await fixture(t,lang),prd=await documentFixture('prd',lang),testing=await documentFixture('testing',lang);
  const states=map.documents.prd.headings[lang][4];
  const withNote=prd.replace('## '+states,(lang==='en'?'### Notes':'### 备注')+'\n- REQ-001 applies to AC-001 above.\n\n## '+states);
  await c.put('prd.md',withNote+'\n- REQ-001 is covered by AC-001.\n\n'+(lang==='en'?'## Summary':'## 总结')+'\n\n| REQ-001 | See the requirement and AC-001 above. |\n');
  const coverage=map.documents.testing.headings[lang][3];
  await c.put('testing.md',testing.replace('## '+coverage,'## '+coverage+'\n\n| Case | Acceptance |\n| --- | --- |\n| TC-001 | AC-001 |')+'\n- TC-001 passed the observed comparison.\n');
  await c.call('init',c.input);await c.call('update',{});await c.call('check');
  assert.equal(hasLocator(await fs.readFile(path.join(c.dir,'prd.md'),'utf8'),'REQ-001',map.documents.prd),true);
  assert.equal(hasLocator(await fs.readFile(path.join(c.dir,'testing.md'),'utf8'),'TC-001',map.documents.testing),true);
  await c.put('testing.md',testing.replace('## '+coverage,'| TC-001 | A conflicting definition for AC-001. |\n\n## '+coverage));
  await assert.rejects(c.call('update',{}),e=>e.code==='DOCUMENT_CHECK'&&e.details.issues.some(i=>i.includes('Duplicate definition TC-001')));
  await c.put('testing.md',testing);
  await c.put('prd.md',prd.replace('## '+states,'| REQ-001 | A conflicting requirement for AC-001. |\n\n## '+states));
  await assert.rejects(c.call('update',{}),e=>e.code==='DOCUMENT_CHECK'&&e.details.issues.some(i=>i.includes('Duplicate definition REQ-001')));
 }
});
test('source summaries are references; conflicting source definitions and missing citations remain errors',async t=>{
 const c=await fixture(t),prd=await documentFixture('prd');
 await c.put('prd.md',prd+'\nSource: [REQ-900](source/external.md).\n');
 const source='## Requirements\n\n| REQ-900 | Export selected orders with their exact totals. |\n';
 await c.put('source/external.md','## Summary\n- REQ-900 is described below.\n\n'+source+'\n## Coverage\n\n| REQ-900 | Covered by export acceptance. |\n\n## 总结\n- REQ-900 is adopted for selected orders.\n');
 await c.call('init',c.input);await c.call('update',{});await c.call('check');
 for(const body of [source+'\n| REQ-900 | Conflicting second requirement definition. |',source.replaceAll('REQ-900','REQ-901')]) {
  await c.put('source/external.md',body);await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});
 }
});
test('inline link syntax examples are not real citations; inline numbered references still work',async t=>{
 const c=await fixture(t),prd=await documentFixture('prd');
 await c.put('prd.md',prd+'\nExample syntax: `[REQ-900](source/missing.md)`. Actual obligation: `REQ-001`.\n');
 await c.call('init',c.input);await c.call('check');
 await c.put('prd.md',prd+'\nActual missing reference: `REQ-999`.\n');
 await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});
});
test('execution tables retain plan approval while a real task revision requires review',async t=>{
 const c=await fixture(t),plan=await documentFixture('plan');
 await c.put('plan.md',plan.replace('## Tasks and completion criteria','| B-001 | Implement selected-order export. |\n\n## Tasks and completion criteria'));
 await c.call('init',c.input);
 await c.call('update',{reviewHistory:await approveFixture(c.dir,c.state,['prd.md','plan.md'])});
 const raw=await fs.readFile(path.join(c.dir,'plan.md'),'utf8'),digest=await reviewFingerprint(c.dir,c.state,reg('plan'));
 await c.put('plan.md',raw+'\n| Task or batch | Status | Result |\n| --- | --- | --- |\n| TASK-001 | done | Export implementation completed. |\n| B-001 | done | Batch implementation completed. |\n');
 await c.call('update',{});
 assert.equal(await reviewFingerprint(c.dir,c.state,reg('plan')),digest);
 assert.equal((await c.call('read')).review.documents.find(d=>d.path==='plan.md').status,'approved');
 await c.put('plan.md',raw.replace('Implement the selected-order export','Implement a changed selection and rounding rule'));
 assert.notEqual(await reviewFingerprint(c.dir,c.state,reg('plan')),digest);
 await assert.rejects(c.call('update',{}),{code:'REVIEW_CHECK'});
});
