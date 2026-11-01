import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {run} from '../lib/cli.mjs';
import {readState,updateState,recoverState} from '../lib/state.mjs';
import {install,installPaths,releaseFiles} from '../lib/install.mjs';
import {packageProtocol,upgradeCompatibility} from '../lib/protocol.mjs';
import {readJSON} from '../lib/io.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg=await readJSON(path.join(root,'package.json')),version=pkg.version;
const runtime={version,activeVersion:version,protocolVersion:1};
async function temp(t) {const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-protocol-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
async function fixture(t,n='17') {const base=await temp(t),dir=path.join(base,'delivery');await fs.cp(path.join(root,'test/fixtures',`preview-${n}`),dir,{recursive:true});return {base,dir,file:path.join(dir,'.aimship/state.json')};}
for(const n of ['17','18']) test(`real preview.${n} synthetic fixture continues without rewriting documents or approvals`,async t=>{
 const c=await fixture(t,n),bytes=await fs.readFile(c.file),before=await readState(c.dir);
 assert.equal(before.state.protocolVersion,undefined);assert.equal(before.state.rulesVersion,`0.1.0-preview.${n}`);
 assert.deepEqual(before.review.documents.map(d=>d.path).sort(),['plan.md','prd.md','tech-design.md','testing.md']);
 assert.ok(before.review.documents.every(d=>d.status==='approved'));
 const documents=new Map(await Promise.all(before.state.documents.map(async d=>[d.path,await fs.readFile(path.join(c.dir,d.path))])));
 for(const command of ['read','check','resume']) {const result=(await run([command,c.dir,'--rules-version',version],{sourceRoot:root})).data;assert.equal(result.versionMismatch??null,null);if(command==='resume'){assert.equal(result.canProceed,true);assert.ok(result.continuation);}}
 assert.deepEqual(await fs.readFile(c.file),bytes,'read/check/resume do not adopt metadata');
 await run(['render',c.dir,'--revision',String(before.state.revision),'--rules-version',version],{sourceRoot:root});assert.deepEqual(await fs.readFile(c.file),bytes,'render changes only the view');
 const state=await updateState(c.dir,{next:{action:'Start overall review'}},before.state.revision,version,runtime);
 assert.equal(state.protocolVersion,1);assert.equal(state.rulesVersion,version);assert.equal(state.revision,before.state.revision+1);
 for(const key of ['deliveryId','createdAt','goal','outcome','stageRuns','reviewHistory','documents','documentDigests'])assert.deepEqual(state[key],before.state[key],key);
 const after=await readState(c.dir);assert.deepEqual(after.review,before.review);assert.deepEqual(after.completion,before.completion);
 for(const [file,content] of documents)assert.deepEqual(await fs.readFile(path.join(c.dir,file)),content,file);
 assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.previous.json')),bytes);
 const next=await updateState(c.dir,{stageRuns:state.stageRuns.map(r=>r.id==='overall'?{...r,progress:'active'}:r),currentRun:'overall'},state.revision,version,runtime);
 assert.equal(next.stageRuns.find(r=>r.id==='overall').progress,'active');assert.deepEqual(next.reviewHistory,state.reviewHistory);
 await assert.rejects(updateState(c.dir,{next:{action:'stale'}},state.revision,version,runtime),{code:'REVISION_CONFLICT'});
 await assert.rejects(updateState(c.dir,{protocolVersion:1},next.revision,version,runtime),{code:'INVALID_STATE'});
});
test('unknown legacy versions/protocols and mixed sessions never write; protocol recovery is explicit',async t=>{
 const c=await fixture(t);let state=await readJSON(c.file);
 for(const bad of [{...state,rulesVersion:'0.1.0-preview.16'},{...state,rulesVersion:version},{...state,protocolVersion:2}]){
  await fs.writeFile(c.file,JSON.stringify(bad));const before=await fs.readFile(c.file);
  const result=(await run(['resume',c.dir,'--rules-version',version],{sourceRoot:root})).data;assert.equal(result.canProceed,false);assert.equal(result.versionMismatch.code,'PROTOCOL_MISMATCH');assert.equal(result.continuation,null);
  await assert.rejects(updateState(c.dir,{},bad.revision,version,runtime),{code:'PROTOCOL_MISMATCH'});assert.deepEqual(await fs.readFile(c.file),before);
 }
 await fs.writeFile(c.file,JSON.stringify(state));
 for(const [session,tool] of [['0.1.0-preview.17',runtime],[version,{...runtime,activeVersion:'0.1.0-preview.17'}],[version,{...runtime,protocolVersion:2}]])await assert.rejects(updateState(c.dir,{},state.revision,session,tool),{code:session===version&&tool.protocolVersion===2?'PROTOCOL_MISMATCH':'VERSION_MISMATCH'});
 await fs.writeFile(c.file,'{corrupt');const backup=await readJSON(path.join(c.dir,'.aimship/state.previous.json'));
 const recovered=await recoverState(c.dir,backup.revision,version,runtime);assert.equal(recovered.protocolVersion,1);assert.equal(recovered.rulesVersion,version);assert.deepEqual(recovered.reviewHistory,backup.reviewHistory);assert.ok(recovered.revision>state.revision);
});
async function sourceCopy(base,name,patch={}) {
 const source=path.join(base,name),{files}=await releaseFiles(root);
 for(const file of Object.keys(files)){const dest=path.join(source,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(root,file),dest);}
 const metadata={...pkg,...patch};if(patch.aimship===null)delete metadata.aimship;await fs.writeFile(path.join(source,'package.json'),JSON.stringify(metadata));return source;
}
test('compatible legacy install switches normally, keeps deliveries intact and reinstalls idempotently',async t=>{
 const base=await temp(t),home=path.join(base,'home'),old=await sourceCopy(base,'old',{version:'0.1.0-preview.17',aimship:null});
 const delivery=path.join(home,'Aimship','existing');await fs.mkdir(delivery,{recursive:true});await fs.writeFile(path.join(delivery,'keep.txt'),'existing delivery');
 await install(old,{home,hosts:['codex']});const result=await install(root,{home});assert.equal(result.compatibility.status,'compatible');assert.equal(result.action,'upgrade');assert.equal(result.upgradeRiskAccepted,false);
 assert.equal(await fs.readFile(path.join(delivery,'keep.txt'),'utf8'),'existing delivery');assert.equal((await install(root,{home})).result,'unchanged');
 const bound=(await run(['bind'],{sourceRoot:path.join(home,'.aimship/releases',version)})).data;assert.equal(bound.version,version);assert.equal(bound.protocolVersion,1);
 // An old executable cannot progress with a session matching it after activation changed.
 const c=await fixture(t);await assert.rejects(updateState(c.dir,{},(await readJSON(c.file)).revision,'0.1.0-preview.17',{version:'0.1.0-preview.17',activeVersion:version,protocolVersion:1}),{code:'VERSION_MISMATCH'});
});
for(const [name,patch,status] of [['unknown',{version:'0.1.0-preview.16',aimship:null},'unverified'],['breaking',{version:'0.2.0',aimship:{protocolVersion:2}},'breaking']])test(`${name} upgrade stops before mutation and accepts only the explicit install flag`,async t=>{
 const base=await temp(t),home=path.join(base,'home'),old=await sourceCopy(base,'old',patch),p=installPaths(home);
 await install(old,{home,hosts:['codex']});const files=[p.active,p.manifest,p.launcher,path.join(home,'.agents/skills/aimship/SKILL.md')],before=await Promise.all(files.map(f=>fs.readFile(f)));
 await assert.rejects(run(['install','--home',home],{sourceRoot:root}),e=>e.code==='UPGRADE_CONFIRMATION_REQUIRED'&&e.details.compatibility.status===status&&e.details.activeVersion===patch.version&&e.details.result==='failed');
 for(let i=0;i<files.length;i++)assert.deepEqual(await fs.readFile(files[i]),before[i]);
 await assert.rejects(run(['install','--home',home,'--yes'],{sourceRoot:root}),{code:'USAGE'});
 const accepted=(await run(['install','--home',home,'--accept-upgrade-risk'],{sourceRoot:root})).data;assert.equal(accepted.upgradeRiskAccepted,true);assert.equal(accepted.activeVersion,version);
 assert.equal((await install(root,{home})).result,'unchanged');
});
test('confirmed interrupted switch recovers with the exact package without re-confirming',async t=>{
 const base=await temp(t),home=path.join(base,'home'),old=await sourceCopy(base,'old',{version:'0.1.0-preview.16',aimship:null}),p=installPaths(home);
 await install(old,{home,hosts:['codex']});const config=await fs.readFile(p.config);await fs.writeFile(p.config,'broken');
 await assert.rejects(install(root,{home,acceptUpgradeRisk:true}),{code:'INSTALL_INCOMPLETE'});assert.equal((await readJSON(p.manifest)).pending.upgradeRiskAccepted,true);
 await fs.writeFile(p.config,config);const result=await install(root,{home});assert.equal(result.result,'recovered');assert.equal(result.activeVersion,version);
});
test('protocol mapping is exact and downgrade to strict legacy tools is breaking',()=>{
 assert.equal(packageProtocol({version:'0.1.0-preview.16'}),null);assert.equal(packageProtocol({version:'0.1.0-preview.18'}),1);
 assert.equal(upgradeCompatibility(pkg,{version:'0.1.0-preview.17'}).status,'breaking');assert.equal(upgradeCompatibility({version:'0.1.0-preview.17'},{version:'0.1.0-preview.18'}).status,'breaking');
});
test('raising the current protocol never reinterprets legacy 17/18 or permits their state writes',async t=>{
 const base=await temp(t),future=await sourceCopy(base,'future',{version:'0.2.0',aimship:{protocolVersion:2}});
 const protocolFile=path.join(future,'lib/protocol.mjs'),code=await fs.readFile(protocolFile,'utf8');
 assert.ok(code.includes('export const PROTOCOL_VERSION = 1;'),'Exercise a real change of the current supported protocol.');
 await fs.writeFile(protocolFile,code.replace('export const PROTOCOL_VERSION = 1;','export const PROTOCOL_VERSION = 2;'));
 const protocol=await import(pathToFileURL(protocolFile).href),futureState=await import(pathToFileURL(path.join(future,'lib/state.mjs')).href),futureInstall=await import(pathToFileURL(path.join(future,'lib/install.mjs')).href);
 assert.equal(protocol.PROTOCOL_VERSION,2);
 for(const n of ['17','18']) {
  const c=await fixture(t,n),before=await fs.readFile(c.file),state=JSON.parse(before),legacyVersion=`0.1.0-preview.${n}`;
  assert.equal(protocol.packageProtocol({version:legacyVersion}),1,`${legacyVersion} package retains its historical protocol`);
  assert.equal(protocol.stateProtocol(state),1,`${legacyVersion} state retains its historical protocol`);
  assert.equal(protocol.upgradeCompatibility({version:legacyVersion},{version:'0.2.0',aimship:{protocolVersion:2}}).status,'breaking');
  await assert.rejects(futureState.updateState(c.dir,{},state.revision,'0.2.0',{version:'0.2.0',activeVersion:'0.2.0',protocolVersion:2}),{code:'PROTOCOL_MISMATCH'});
  assert.deepEqual(await fs.readFile(c.file),before,'Unsupported historical state is not adopted into protocol 2.');
  const old=await sourceCopy(base,`old-${n}`,{version:legacyVersion,aimship:null}),home=path.join(base,`home-${n}`),p=installPaths(home);
  await futureInstall.install(old,{home,hosts:['codex']});
  const files=[p.active,p.manifest,p.launcher],bytes=await Promise.all(files.map(file=>fs.readFile(file)));
  await assert.rejects(futureInstall.install(future,{home}),error=>error.code==='UPGRADE_CONFIRMATION_REQUIRED' && error.details.compatibility.status==='breaking');
  for(let i=0;i<files.length;i++)assert.deepEqual(await fs.readFile(files[i]),bytes[i],'Protocol 2 switch stops before installation mutation.');
 }
});
