import { documentFixture } from '../scripts/testing/documents.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {initState,updateState,readState,renderState,checkReferences} from '../lib/state.mjs';
import {run} from '../lib/cli.mjs';
import {install} from '../lib/install.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
async function fixture(t) {
 const base=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-reliability-state-')));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const dataRoot=path.join(base,'deliveries'),dir=path.join(dataRoot,'account');await fs.mkdir(path.join(dir,'source'),{recursive:true});
 await fs.writeFile(path.join(dir,'source/request.md'),'合成原始诉求：用户账号功能；已有原型，尚无PRD。');
 return {base,dataRoot,dir,runtime:{version,activeVersion:version,dataRoot},input:{language:'zh-CN',goal:{summary:'用户账号功能'},stageRuns:[{id:'req',stage:'requirements',scope:'澄清账号功能',progress:'active',inputRefs:[],outputRefs:[]}],currentRun:'req'}};
}
test('configured root differs from material workspace: new init rejects project and root, supports explicit evidence and preserves outside-root resume',async t=>{
 const c=await fixture(t),home=path.join(c.base,'home');
 await install(root,{home,hosts:['codex'],dataRoot:c.dataRoot});
 const sourceRoot=path.join(home,'.aimship','releases',version),context={sourceRoot};
 const project=path.join(c.base,'prototype-project');await fs.mkdir(path.join(project,'source'),{recursive:true});await fs.writeFile(path.join(project,'prototype.html'),'<h1>original synthetic prototype</h1>');await fs.writeFile(path.join(project,'source/request.md'),'Synthetic user explicitly selected this delivery folder.');
 const json=path.join(c.base,'input.json');await fs.writeFile(json,JSON.stringify(c.input));
 const cli=(command,dir)=>run([command,dir,'--rules-version',version,...(command==='init'?['--input',json]:[])],context);
 await assert.rejects(cli('init',project),{code:'INIT_LOCATION_REQUIRED'});await assert.rejects(fs.access(path.join(project,'.aimship/state.json')));
 await assert.rejects(cli('init',c.dataRoot),{code:'INIT_LOCATION_ROOT'});
 const normal=(await cli('init',c.dir)).data;assert.equal(normal.storage.mode,'configured');assert.equal(normal.language,'zh-CN');
 await fs.writeFile(json,JSON.stringify({...c.input,storage:{mode:'explicit',decisionRef:'source/missing.md'}}));await assert.rejects(cli('init',project),{code:'LOCATION_DECISION'});
 await fs.writeFile(json,JSON.stringify({...c.input,storage:{mode:'explicit',decisionRef:'source/request.md'}}));
 const explicit=(await cli('init',project)).data;assert.equal(explicit.storage.mode,'explicit');assert.equal((await cli('resume',project)).data.state.deliveryId,explicit.deliveryId);
 await assert.rejects(cli('init',project),{code:'ALREADY_EXISTS'});assert.equal(await fs.readFile(path.join(project,'prototype.html'),'utf8'),'<h1>original synthetic prototype</h1>');
});
test('AI workspace without code: configured delivery survives a new CLI working directory without copying or binding repositories',async t=>{
 const c=await fixture(t),home=path.join(c.base,'isolated-home');
 await install(root,{home,hosts:['codex'],dataRoot:c.dataRoot});
 const workspace=path.join(c.base,'ai-workspace'),nextWorkspace=path.join(c.base,'new-session');
 await fs.mkdir(workspace);await fs.mkdir(nextWorkspace);
 const prototype=path.join(workspace,'prototype.html');await fs.writeFile(prototype,'<p>Synthetic supplied prototype, no code repository.</p>');
 const original=await fs.readFile(prototype),launcher=path.join(home,'.aimship/bin/aimship.mjs');
 const invoke=(cwd,args,input)=>{
   const result=spawnSync(process.execPath,[launcher,...args],{cwd,input:input===undefined?undefined:JSON.stringify(input),encoding:'utf8',timeout:15000});
   assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout).data;
 };
 assert.equal(invoke(workspace,['bind']).dataRoot,c.dataRoot);
 const state=invoke(workspace,['init',c.dir,'--rules-version',version,'--input','-'],c.input);
 assert.deepEqual(state.repositories,[]);assert.equal(state.storage.dataRoot,c.dataRoot);assert.equal(state.writeResult.stateSaved,true);
 const file=path.join(c.dir,'.aimship/state.json'),bytes=await fs.readFile(file);
 const resumed=invoke(nextWorkspace,['resume',c.dir,'--rules-version',version,'--delivery-id',state.deliveryId]);
 assert.equal(resumed.state.deliveryId,state.deliveryId);assert.equal(resumed.state.currentRun,'req');assert.equal(resumed.state.language,'zh-CN');assert.deepEqual(resumed.state.repositories,[]);
 assert.deepEqual(await fs.readFile(file),bytes);assert.deepEqual(await fs.readFile(prototype),original);
 assert.deepEqual(await fs.readdir(workspace),['prototype.html']);assert.deepEqual(await fs.readdir(nextWorkspace),[]);
});
test('readable delivery does not imply write access: simulated save denial preserves state and source without fallback',async t=>{
 const c=await fixture(t),request=path.join(c.dir,'source/request.md'),original=await fs.readFile(request),open=fs.open;
 // Simulate write permission revocation after reads and location checks succeed.
 // This verifies error handling, not an AI tool permission UI or OS ACL matrix.
 const denied=t.mock.method(fs,'open',async(file,...args)=>{
   if(path.dirname(file)===path.join(c.dir,'.aimship') && path.basename(file).startsWith('.state.json.')) throw Object.assign(new Error('Synthetic write denial'),{code:'EACCES'});
   return open(file,...args);
 });
 await assert.rejects(initState(c.dir,c.input,version,c.runtime),{code:'EACCES'});
 await assert.rejects(fs.access(path.join(c.dir,'.aimship/state.json')),{code:'ENOENT'});
 await assert.rejects(fs.access(path.join(c.dir,'status.md')),{code:'ENOENT'});
 assert.deepEqual(await fs.readFile(request),original);assert.deepEqual(await fs.readdir(path.join(c.dir,'.aimship')),[]);
 denied.mock.restore();
 const state=await initState(c.dir,c.input,version,c.runtime),file=path.join(c.dir,'.aimship/state.json'),bytes=await fs.readFile(file),view=await fs.readFile(path.join(c.dir,'status.md'));
 t.mock.method(fs,'open',async(file,...args)=>{
   if(path.dirname(file)===path.join(c.dir,'.aimship') && path.basename(file).startsWith('.state.json.')) throw Object.assign(new Error('Synthetic write denial'),{code:'EACCES'});
   return open(file,...args);
 });
 assert.equal((await readState(c.dir)).state.deliveryId,state.deliveryId);
 await assert.rejects(updateState(c.dir,{next:{action:'Must not report this as saved'}},state.revision,version,c.runtime),{code:'EACCES'});
 assert.deepEqual(await fs.readFile(file),bytes);assert.deepEqual(await fs.readFile(path.join(c.dir,'status.md')),view);assert.deepEqual(await fs.readFile(request),original);
 assert.deepEqual(await fs.readdir(c.base),['deliveries']);
});
test('Chinese delivery language persists across update/render/resume; explicit English switch preserves original material',async t=>{
 const c=await fixture(t);let state=await initState(c.dir,c.input,version,c.runtime);const original=await fs.readFile(path.join(c.dir,'source/request.md'));
 assert.equal(state.writeResult.receipt.currentStage,'requirements');
 assert.equal(state.next.action,'澄清诉求并准备需求审核。');
 let view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(view,/# 交付进度/);assert.match(view,/技术设计.*尚未开始/);assert.match(view,/等待|进行中/);assert.doesNotMatch(view,/# Delivery status|## Goal and basis|Missing current/);
 state=await updateState(c.dir,{next:{action:'确认账号规则'}},state.revision,version,c.runtime);await renderState(c.dir,state.revision,version,c.runtime);
 const resumed=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;
 assert.equal(resumed.state.language,'zh-CN');assert.match(resumed.continuation,/使用 Aimship 继续交付/);assert.match(resumed.completion.gaps[0],/尚待确认/);assert.match(resumed.warnings[0],/续接/);
 state=await updateState(c.dir,{language:'en'},state.revision,version,c.runtime);assert.equal(state.language,'en');assert.match(await fs.readFile(path.join(c.dir,'status.md'),'utf8'),/# Delivery progress/);assert.deepEqual(await fs.readFile(path.join(c.dir,'source/request.md')),original);assert.equal(state.next.action,'确认账号规则');
});
test('original source drift cannot be accepted by unrelated update; restoring original permits deliberate requirement work',async t=>{
 const c=await fixture(t);let state=await initState(c.dir,c.input,version,c.runtime);const request=path.join(c.dir,'source/request.md'),original=await fs.readFile(request),file=path.join(c.dir,'.aimship/state.json'),bytes=await fs.readFile(file);
 await fs.writeFile(request,'Changed synthetic original, not approved.');
 assert.ok((await readState(c.dir)).documentChanges.includes('source/request.md'));
 await assert.rejects(updateState(c.dir,{next:{action:'Just save this note'}},state.revision,version,c.runtime),{code:'SOURCE_CHANGED'});assert.deepEqual(await fs.readFile(file),bytes);
 await fs.writeFile(request,original);state=await updateState(c.dir,{next:{action:'在正式需求记录后续变更，保留原始诉求'}},state.revision,version,c.runtime);assert.deepEqual((await readState(c.dir)).documentChanges,[]);
});

test('bind obtains schema from the bound release rather than mixing executing metadata',async t=>{
 const c=await fixture(t),installRoot=path.join(c.base,'installation'),executing=path.join(installRoot,'releases','0.0.1'),target=path.join(installRoot,'releases','0.0.2');
 await fs.mkdir(executing,{recursive:true});await fs.writeFile(path.join(executing,'package.json'),JSON.stringify({version:'0.0.1'}));
 await fs.mkdir(path.join(target,'lib'),{recursive:true});await fs.mkdir(path.join(target,'skills/aimship/references'),{recursive:true});
 await fs.writeFile(path.join(target,'package.json'),JSON.stringify({version:'0.0.2'}));await fs.writeFile(path.join(target,'lib/state.mjs'),'export const SCHEMA_VERSION = 42;');await fs.writeFile(path.join(target,'skills/aimship/references/core.md'),'Synthetic future protocol only, not a real release.');
 await fs.writeFile(path.join(installRoot,'install-manifest.json'),JSON.stringify({schemaVersion:1,product:'aimship'}));await fs.writeFile(path.join(installRoot,'active.json'),JSON.stringify({launcherProtocol:1,version:'0.0.2'}));await fs.writeFile(path.join(installRoot,'config.json'),JSON.stringify({schemaVersion:1,dataRoot:c.dataRoot}));
 const bound=(await run(['bind'],{sourceRoot:executing,installRoot})).data;assert.equal(bound.version,'0.0.2');assert.equal(bound.schemaVersion,42);assert.equal(bound.toolSchemaVersion,4);assert.equal(bound.toolVersion,'0.0.1');
});


test('Chinese display translates enum labels but preserves run, group and approval identifiers',async t=>{
 const c=await fixture(t);c.input.stageRuns[0].id='plan';c.input.stageRuns[0].sessionGroup='pending';c.input.currentRun='plan';
 let state=await initState(c.dir,c.input,version,c.runtime);
 await fs.writeFile(path.join(c.dir,'prd.md'),await documentFixture('prd'));
 state=await updateState(c.dir,{goalRef:'prd.md',documentPolicy:{authority:'authored'},documents:[{kind:'prd',path:'prd.md',mode:'new',version:'1'}],stageRuns:[{...state.stageRuns[0],progress:'done',resultRef:'prd.md#requirements',outputRefs:['prd.md']}]},state.revision,version,c.runtime);
 const records=await approveFixture(c.dir,state,['prd.md']);records[0].id='requirements';records[1].id='pending';
 state=await updateState(c.dir,{reviewHistory:records},state.revision,version,c.runtime);
 const view=await fs.readFile(path.join(c.dir,'status.md'),'utf8');assert.match(view,/当前阶段: 需求 · 已完成/);assert.match(view,/自检记录通过 · 已批准/);const read=await readState(c.dir);assert.equal(read.state.currentRun,'plan');assert.equal(read.state.stageRuns[0].sessionGroup,'pending');assert.equal(read.review.documents[0].approval,'pending');
});
