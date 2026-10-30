import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run} from '../lib/cli.mjs';
import {documentFixture} from '../scripts/testing/documents.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {validateState} from '../lib/state.mjs';
const sourceRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(sourceRoot,'package.json'))).version;
const reg=(kind,mode='new')=>({kind,path:kind+'.md',mode,version:'1',...(mode==='reused'?{basisRef:'.aimship/init.md'}:{})});
async function fixture(t,docs=[reg('prd')],authority='authored') {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-consistency-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'source'));await fs.mkdir(path.join(dir,'.aimship'),{recursive:true});await fs.writeFile(path.join(dir,'.aimship/init.md'),'Synthetic commission explicitly selects this isolated directory. Export selected orders.');
 for(const doc of docs) await fs.writeFile(path.join(dir,doc.path),await documentFixture(doc.kind));
 const input={language:'en',storage:{mode:'explicit',decisionRef:'.aimship/init.md'},goal:{summary:'Export orders',endpoint:'Verified local changes'},goalRef:'prd.md',documentPolicy:{authority,interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:docs};
 let state;
 const call=async(command,patch)=>{
  const args=[command,dir,'--rules-version',version];
  if(patch!==undefined){const file=path.join(dir,'input.json');await fs.writeFile(file,JSON.stringify(patch));args.push('--input',file);if(command==='update')args.push('--revision',String(state.revision));}
  const result=await run(args,{sourceRoot});if(['init','update'].includes(command))state=result.data;return result.data;
 };
 await call('init',input);
 return {dir,call,get state(){return state;},put:(file,body)=>fs.writeFile(path.join(dir,file),body)};
}
test('CLI source citations validate actual file and unique number without defining foreign IDs locally',async t=>{
 const c=await fixture(t),original=await fs.readFile(path.join(c.dir,'prd.md'),'utf8');
 await c.put('source/external.md','## Source\n\n| REQ-900 | Supplied source requirement: export selected orders. |');
 await c.put('prd.md',original+'\nLocal REQ-001 adopts [REQ-900](source/external.md). Open the source file and search the visible number.\n');
 await c.call('update',{});await c.call('check');
 const saved=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 for(const target of ['source/missing.md#REQ-900','source/external.md#REQ-999']) {
  await c.put('prd.md',original+`\nSource [requirement](${target}).\n`);
  await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});
  assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),saved);
 }
 await c.put('prd.md',original+'\nUnqualified REQ-999 remains a missing local reference.');
 await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});
 await c.put('source/external.md','| REQ-900 | Source one. |\n| REQ-900 | Source two. |');
 await c.put('prd.md',original+'\n[Source](source/external.md#REQ-900)');
 await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});
 await c.put('source/external.md','| REQ-900 | TBD |');
 await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});
 await c.put('source/external.md','| REQ-900 | The source requires exporting selected orders. |');
 await c.call('update',{});await c.call('check');
});
test('CLI registered editable PRD supplies readable IDs without copying or imposing our outline',async t=>{
 const c=await fixture(t,[reg('prd','reused')],'editable');
 const reused='# Supplied PRD\n\n| REQ-001 | Export selected orders. |\n| AC-001 | Exported totals exactly match selected orders. |\n';
 await c.put('prd.md',reused);await c.put('testing.md',await documentFixture('testing'));
 await c.call('update',{documents:[...c.state.documents,reg('testing')]});await c.call('check');
 assert.equal(await fs.readFile(path.join(c.dir,'prd.md'),'utf8'),reused);
 await c.put('testing.md',(await documentFixture('testing')).replaceAll('AC-001','AC-999'));
 await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});
});
test('CLI batch definitions require the approved design surface; execution may cite approved batches',async t=>{
 const c=await fixture(t,[reg('prd'),reg('plan')]);
 // Locate by the shared heading rather than assuming its full wording.
 const {artifactMap}=await import('../lib/documents.mjs');const spec=(await artifactMap()).documents.plan;
 const text=(await documentFixture('plan')).replace('## '+spec.headings.en[spec.sections.indexOf('tasks')],'| B-001 | Export implementation batch for REQ-001. |\n\n## '+spec.headings.en[spec.sections.indexOf('tasks')]);
 await c.put('plan.md',text);await c.call('update',{reviewHistory:await approveFixture(c.dir,c.state,['prd.md','plan.md'])});
 const digest=await reviewFingerprint(c.dir,c.state,reg('plan'));
 await c.put('plan.md',text+'\nProgress for B-001: implementation has not started.\n');await c.call('update',{});
 assert.equal(await reviewFingerprint(c.dir,c.state,reg('plan')),digest);
 const saved=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 await c.put('plan.md',text+'\n| B-002 | New unapproved batch for REQ-001. |');
 await assert.rejects(c.call('update',{}),{code:'DOCUMENT_CHECK'});assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),saved);
 const revised=text.replace('| B-001 |','| B-002 |');await c.put('plan.md',revised);
 assert.notEqual(await reviewFingerprint(c.dir,c.state,reg('plan')),digest);
 await assert.rejects(c.call('update',{}),{code:'REVIEW_CHECK'});
 await c.put('source/change.md','Synthetic explicit decision CHG-001: replace the planned batch, self-check and approve revised plan.');
 const documents=c.state.documents.map(d=>d.kind==='plan'?{...d,version:'2'}:d);
 await c.call('update',{documents,openChanges:[{id:'CHG-001',ref:'source/change.md',status:'open'}],reviewHistory:await approveFixture(c.dir,{...c.state,documents},['plan.md'])});
});
test('current state requires the saved delivery language; invalid updates preserve saved bytes',async t=>{
 const help=(await run(['help'],{sourceRoot})).data;
 assert.equal(help.stateProtocol.stageInstance.resultRef,'review.md#REV-001 (required when done)');
 assert.match(help.stateProtocol.topLevel.language,/Required in current state/);assert.match(help.commands.scan,/\.aimship\/state\.json/);
 const c=await fixture(t),missing={...c.state};delete missing.language;
 assert.throws(()=>validateState(missing),{code:'INVALID_STATE'});
 const saved=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 await assert.rejects(c.call('update',{language:null}),{code:'INVALID_STATE'});
 assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),saved);
 await c.call('update',{language:'zh-CN'});assert.equal((await c.call('resume')).state.language,'zh-CN');
});
