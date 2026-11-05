import {nativeDelivery} from '../scripts/testing/native-delivery.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {run} from '../lib/cli.mjs';
import {updateState,recoverState} from '../lib/state.mjs';
import {install,installPaths,releaseFiles} from '../lib/install.mjs';
import {packageProtocol,upgradeCompatibility} from '../lib/protocol.mjs';
import {readJSON} from '../lib/io.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg=await readJSON(path.join(root,'package.json')),version=pkg.version;
const runtime={version,activeVersion:version,protocolVersion:3};
async function temp(t) {const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-protocol-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
async function fixture(t,n='17') {const base=await temp(t),dir=path.join(base,'delivery');await fs.cp(path.join(root,'test/fixtures',`preview-${n}`),dir,{recursive:true});return {base,dir,file:path.join(dir,'.aimship/state.json')};}
for(const n of ['17','18','19']) test(`preview.${n} protocol-1 fixture is preserved and cannot be continued by protocol 3`,async t=>{
 const c=await fixture(t,n),before=await fs.readFile(c.file),state=JSON.parse(before);
 assert.equal(state.schemaVersion,4);
 const files=new Map(await Promise.all(state.documents.map(async d=>[d.path,await fs.readFile(path.join(c.dir,d.path))])));
 for(const command of ['read','check','resume','render']) {
  await assert.rejects(run([command,c.dir,'--rules-version',version,...(command==='render'?['--revision',String(state.revision)]:[])],{sourceRoot:root}),{code:'PROTOCOL_MISMATCH'});
 }
 await assert.rejects(updateState(c.dir,{},state.revision,version,runtime),{code:'PROTOCOL_MISMATCH'});
 await assert.rejects(recoverState(c.dir,state.revision,version,runtime),e=>['PROTOCOL_MISMATCH','ENOENT'].includes(e.code));
 assert.deepEqual(await fs.readFile(c.file),before,'No operation migrates or relabels historical state.');
 for(const [file,bytes] of files)assert.deepEqual(await fs.readFile(path.join(c.dir,file)),bytes,file);
});
test('unknown schemas, metadata relabeling and old software cannot adopt historical state',async t=>{
 const c=await fixture(t),original=await fs.readFile(c.file),state=JSON.parse(original);
 for(const patch of [{rulesVersion:'0.1.0-preview.16'},{rulesVersion:version},{protocolVersion:3},{schemaVersion:5,protocolVersion:1}]) {
  const changed={...state,...patch};await fs.writeFile(c.file,JSON.stringify(changed));const bytes=await fs.readFile(c.file);
  await assert.rejects(updateState(c.dir,{},changed.revision,version,runtime),{code:'PROTOCOL_MISMATCH'});assert.deepEqual(await fs.readFile(c.file),bytes);
 }
});
test('current protocol retains software, active-installation and session consistency protections',async t=>{
 const c=await nativeDelivery(t,{initializeOnly:true}),before=await fs.readFile(path.join(c.dir,'.aimship/state.json'));
 for(const [session,tool,code] of [
  ['0.1.0-preview.17',c.runtime,'VERSION_MISMATCH'],
  [c.version,{...c.runtime,activeVersion:'0.1.0-preview.17'},'VERSION_MISMATCH'],
  [c.version,{...c.runtime,protocolVersion:1},'PROTOCOL_MISMATCH']
 ])await assert.rejects(updateState(c.dir,{},c.state.revision,session,tool),{code});
 assert.deepEqual(await fs.readFile(path.join(c.dir,'.aimship/state.json')),before);
});
async function sourceCopy(base,name,patch={}) {
 const source=path.join(base,name),{files}=await releaseFiles(root);
 for(const file of Object.keys(files)){const dest=path.join(source,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(root,file),dest);}
 const metadata={...pkg,...patch};if(patch.aimship===null)delete metadata.aimship;await fs.writeFile(path.join(source,'package.json'),JSON.stringify(metadata));return source;
}
test('confirmed legacy protocol upgrade keeps deliveries intact and reinstalls idempotently',async t=>{
 const base=await temp(t),home=path.join(base,'home'),old=await sourceCopy(base,'old',{version:'0.1.0-preview.17',aimship:null});
 const delivery=path.join(home,'Aimship','existing');await fs.mkdir(delivery,{recursive:true});await fs.writeFile(path.join(delivery,'keep.txt'),'existing delivery');
 await install(old,{home,hosts:['codex']});await assert.rejects(install(root,{home}),{code:'UPGRADE_CONFIRMATION_REQUIRED'});const result=await install(root,{home,acceptUpgradeRisk:true});assert.equal(result.compatibility.status,'breaking');assert.equal(result.action,'upgrade');assert.equal(result.upgradeRiskAccepted,true);
 assert.equal(await fs.readFile(path.join(delivery,'keep.txt'),'utf8'),'existing delivery');assert.equal((await install(root,{home})).result,'unchanged');
 const bound=(await run(['bind'],{sourceRoot:path.join(home,'.aimship/releases',version)})).data;assert.equal(bound.version,version);assert.equal(bound.protocolVersion,3);
 // Historical state remains unsupported even if an old session/tool label is supplied.
 const c=await fixture(t);await assert.rejects(updateState(c.dir,{},(await readJSON(c.file)).revision,'0.1.0-preview.17',{version:'0.1.0-preview.17',activeVersion:version,protocolVersion:1}),{code:'PROTOCOL_MISMATCH'});
});
for(const [name,patch,status] of [['unknown',{version:'0.1.0-preview.16',aimship:null},'unverified'],['breaking',{version:'0.2.0',aimship:{protocolVersion:1}},'breaking']])test(`${name} upgrade stops before mutation and accepts only the explicit install flag`,async t=>{
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
 const base=await temp(t),future=await sourceCopy(base,'future',{version:'0.2.0',aimship:{protocolVersion:4}});
 const protocolFile=path.join(future,'lib/protocol.mjs'),code=await fs.readFile(protocolFile,'utf8');
 assert.ok(code.includes('export const PROTOCOL_VERSION = 3;'),'Exercise a real change of the current supported protocol.');
 await fs.writeFile(protocolFile,code.replace('export const PROTOCOL_VERSION = 3;','export const PROTOCOL_VERSION = 4;'));
 const protocol=await import(pathToFileURL(protocolFile).href),futureState=await import(pathToFileURL(path.join(future,'lib/state.mjs')).href),futureInstall=await import(pathToFileURL(path.join(future,'lib/install.mjs')).href);
 assert.equal(protocol.PROTOCOL_VERSION,4);
 for(const n of ['17','18']) {
  const c=await fixture(t,n),before=await fs.readFile(c.file),state=JSON.parse(before),legacyVersion=`0.1.0-preview.${n}`;
  assert.equal(protocol.packageProtocol({version:legacyVersion}),1,`${legacyVersion} package retains its historical protocol`);
  assert.equal(protocol.stateProtocol(state),1,`${legacyVersion} state retains its historical protocol`);
  assert.equal(protocol.upgradeCompatibility({version:legacyVersion},{version:'0.2.0',aimship:{protocolVersion:4}}).status,'breaking');
  await assert.rejects(futureState.updateState(c.dir,{},state.revision,'0.2.0',{version:'0.2.0',activeVersion:'0.2.0',protocolVersion:4}),{code:'PROTOCOL_MISMATCH'});
  assert.deepEqual(await fs.readFile(c.file),before,'Unsupported historical state is not adopted into the future protocol.');
  const old=await sourceCopy(base,`old-${n}`,{version:legacyVersion,aimship:null}),home=path.join(base,`home-${n}`),p=installPaths(home);
  await futureInstall.install(old,{home,hosts:['codex']});
  const files=[p.active,p.manifest,p.launcher],bytes=await Promise.all(files.map(file=>fs.readFile(file)));
  await assert.rejects(futureInstall.install(future,{home}),error=>error.code==='UPGRADE_CONFIRMATION_REQUIRED' && error.details.compatibility.status==='breaking');
  for(let i=0;i<files.length;i++)assert.deepEqual(await fs.readFile(files[i]),bytes[i],'Protocol 4 switch stops before installation mutation.');
 }
});
