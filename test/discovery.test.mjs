import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {scanDeliveries} from '../lib/discovery.mjs';
import {json} from '../lib/io.mjs';
const version=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url))).version;
test('scan reports linked state, internal paths and directory aliases without claiming their identities', async t => {
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'aimship-scan-')));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const scanRoot = path.join(root, 'scan'); await fs.mkdir(scanRoot);
  const modern = path.join(scanRoot, 'actual-modern');
  await fs.mkdir(path.join(modern, '.aimship'), { recursive: true });
  const modernState = { revision:0,deliveryId:'modern-id',rulesVersion:version,goal:{summary:'Synthetic scan',endpoint:null},goalRef:'source/request.md',cycle:1,closureRefs:[],stageRuns:[],currentRun:null,openChanges:[],repositories:[],outcome:{goal:'in-progress',acceptance:'not-recorded'},next:{action:'Clarify'}, schemaVersion: 4, language:'en', reviewPolicy:1, reviewHistory:[], deliveryPolicy:{version:1}, documentPolicy:{authority:null,interaction:null,prototypeCovered:null,interface:null,databases:null}, documents: [] };
  await fs.writeFile(path.join(modern, '.aimship/state.json'), json(modernState));
  for (const name of ['linked-state', 'linked-internal', 'broken-state']) await fs.mkdir(path.join(scanRoot, name));
  for (const name of ['linked-state', 'broken-state']) await fs.mkdir(path.join(scanRoot, name, '.aimship'));
  await fs.symlink(path.join(modern, '.aimship/state.json'), path.join(scanRoot, 'linked-state/.aimship/state.json'));
  await fs.symlink(path.join(modern, '.aimship'), path.join(scanRoot, 'linked-internal/.aimship'), 'junction');
  await fs.symlink(path.join(root, 'absent-state.json'), path.join(scanRoot, 'broken-state/.aimship/state.json'));
  await fs.symlink(modern, path.join(scanRoot, 'linked-directory'), 'junction');
  const result = await scanDeliveries(scanRoot);
  assert.deepEqual(result.records.map(record => record.deliveryId).sort(), ['modern-id']);
  assert.deepEqual(result.issues.map(issue => [path.basename(issue.directory), issue.reason]).sort(),
    ['linked-state', 'linked-internal', 'broken-state', 'linked-directory'].map(name=>[name,'SYMLINK']).sort());
  assert.equal(await fs.readFile(path.join(modern, '.aimship/state.json'), 'utf8'), json(modernState));
  await fs.cp(modern,path.join(scanRoot,'duplicate'),{recursive:true});assert.ok((await scanDeliveries(scanRoot)).issues.some(i=>i.reason==='duplicate-delivery-id'));
});
