import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite, exists, fail, hash, json, noSymlinks, readJSON, withLock } from './io.mjs';
import { statePaths, validateState, assertInstallationComplete, readState } from './state.mjs';
import { savedResult } from './view.mjs';

export async function migrateState(directory, revision, rulesVersion, runtime, input) {
  assertInstallationComplete(runtime);
  if (rulesVersion !== runtime.version || runtime.version !== runtime.activeVersion) fail('VERSION_MISMATCH','Migration requires the active tool.','Bind the active version.');
  if (!input || Object.keys(input).length !== 1 || typeof input.compatibilityRef !== 'string' || !input.compatibilityRef.trim()) fail('USAGE','Migration input is {compatibilityRef}.','Record the assessment and old/new document disposition first.');
  const old=statePaths(directory,true), modern=statePaths(directory);
  await noSymlinks(modern.internal); await fs.mkdir(modern.internal,{recursive:true});
  return withLock(old.lock,()=>withLock(modern.lock,async()=>{
    const journalPath=path.join(modern.internal,'migration.json');
    let journal;
    if (await exists(journalPath)) {
      journal=await readJSON(journalPath);
      if (journal.protocol !== 1 || journal.revision !== revision || journal.compatibilityRef !== input.compatibilityRef) fail('MIGRATION_CONFLICT','Migration parameters or journal differ.','Inspect recorded migration; never overwrite the copies.');
      if (journal.status==='complete') {
        if (await exists(old.statePath)) fail('LAYOUT_CONFLICT','A root state reappeared after migration.','Inspect both states before proceeding.');
        return {state:(await readState(directory)).state,migration:'already-complete'};
      }
    } else {
      if (await exists(modern.statePath) || await exists(modern.backup)) fail('LAYOUT_CONFLICT','Target state/recovery already exists.','Inspect both layouts; do not merge by timestamp.');
      await noSymlinks(old.statePath); await noSymlinks(old.backup);
      const raw=await fs.readFile(old.statePath,'utf8'), state=JSON.parse(raw);
      validateState(state);
      if (state.schemaVersion!==1) fail('UNKNOWN_SCHEMA','Only schema 1 root state can migrate.','Keep unknown formats read-only.');
      if (state.revision!==revision) fail('REVISION_CONFLICT','Legacy revision changed.','Read and reassess before migration.');
      const next={...state,schemaVersion:2,revision:state.revision+1,updatedAt:new Date().toISOString(),documentPolicy:{authority:'legacy'},documents:[],legacyRunIds:state.stageRuns.map(r=>r.id),migration:{fromSchema:1,compatibilityRef:input.compatibilityRef}};
      // validate the assessment reference with the ordinary state reference protocol.
      validateState({...next,next:{...next.next,inputRefs:[input.compatibilityRef]}});
      const backupRaw=await exists(old.backup)?await fs.readFile(old.backup,'utf8'):null;
      journal={protocol:1,status:'prepared',revision,compatibilityRef:input.compatibilityRef,sourceHash:hash(raw),backupHash:backupRaw===null?null:hash(backupRaw),targetHash:hash(json(next)),target:next};
      const legacyDir=path.join(modern.internal,'legacy'); await noSymlinks(legacyDir); await fs.mkdir(legacyDir,{recursive:true});
      for (const [name,bytes] of [['state.json',raw],['state.previous.json',backupRaw]]) {
        if(bytes===null) continue;
        const file=path.join(legacyDir,name);
        if(await exists(file) && hash(await fs.readFile(file))!==hash(bytes)) fail('MIGRATION_CONFLICT','Legacy backup differs.','Preserve all copies and resolve manually.');
        if(!await exists(file)) await atomicWrite(file,bytes);
      }
      await atomicWrite(journalPath,json(journal));
    }
    validateState(journal.target);
    if (hash(json(journal.target))!==journal.targetHash) fail('MIGRATION_CONFLICT','Migration target checksum changed.','Inspect journal and preserved source.');
    const legacyCopy=path.join(modern.internal,'legacy/state.json');
    if(hash(await fs.readFile(legacyCopy))!==journal.sourceHash) fail('MIGRATION_CONFLICT','Preserved source changed.','Recover the original source before resuming.');
    if(await exists(old.statePath) && hash(await fs.readFile(old.statePath))!==journal.sourceHash) fail('MIGRATION_CONFLICT','Legacy state changed during migration.','Reconcile facts; do not overwrite either copy.');
    if(await exists(modern.statePath) && hash(await fs.readFile(modern.statePath))!==journal.targetHash) fail('MIGRATION_CONFLICT','Target state changed during migration.','Reconcile both states.');
    if(await exists(old.backup) && hash(await fs.readFile(old.backup))!==journal.backupHash) fail('MIGRATION_CONFLICT','Legacy recovery copy changed.','Preserve both recovery copies.');
    if(!await exists(modern.statePath)) await atomicWrite(modern.statePath,json(journal.target));
    await fs.rm(old.statePath,{force:true}); await fs.rm(old.backup,{force:true});
    await atomicWrite(journalPath,json({...journal,status:'complete'}));
    return savedResult(directory,journal.target);
  }));
}

// Discovery is intentionally bounded to named material roots, never the home or code tree.
export async function scanDeliveries(root) {
  const records=[],issues=[],seen=new Map();
  for(const entry of await fs.readdir(root,{withFileTypes:true})) {
    if(!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const directory=path.join(root,entry.name);
    if(!await exists(path.join(directory,'state.json')) && !await exists(path.join(directory,'.aimship/state.json'))) continue;
    try {
      const read=await readState(directory), id=read.state.deliveryId;
      if(read.conflict || read.readOnly) {issues.push({directory,reason:read.conflict?'layout-conflict':'unknown-schema',candidates:read.candidates}); continue;}
      if(seen.has(id)) {issues.push({directory,reason:'duplicate-delivery-id',other:seen.get(id)}); continue;}
      seen.set(id,directory);
      records.push({directory,statePath:read.statePath,deliveryId:id,rulesVersion:read.state.rulesVersion,repositories:read.state.repositories,currentRun:read.state.currentRun,stageRuns:read.state.stageRuns,outcome:read.state.outcome,next:read.state.next,updatedAt:read.state.updatedAt,migration:read.migration?.status??null});
    } catch(error) {issues.push({directory,reason:error.code??error.message});}
  }
  return {root:path.resolve(root),records,issues,limits:'Named root immediate children only. Records may be stale; unknown roots and non-Aimship work are outside this check. Agent must assess actual writing intent and checkout/worktree identity.'};
}
