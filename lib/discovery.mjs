import fs from 'node:fs/promises';
import path from 'node:path';
import { exists, noSymlinks } from './io.mjs';
import { readState } from './state.mjs';


// Discovery is intentionally bounded to named material roots, never the home or code tree.
export async function scanDeliveries(root) {
  const records=[],issues=[],seen=new Map();
  for(const entry of await fs.readdir(root,{withFileTypes:true})) {
    if(entry.name.startsWith('.')) continue;
    const directory=path.join(root,entry.name);
    if(entry.isSymbolicLink()) {issues.push({directory,reason:'SYMLINK'}); continue;}
    if(!entry.isDirectory()) continue;
    try {
      await noSymlinks(path.join(directory,'.aimship/state.json'));
      if(!await exists(path.join(directory,'.aimship/state.json'))) continue;
      const read=await readState(directory), id=read.state.deliveryId;
      if(seen.has(id)) {issues.push({directory,reason:'duplicate-delivery-id',other:seen.get(id)}); continue;}
      seen.set(id,directory);
      records.push({directory,statePath:read.statePath,deliveryId:id,rulesVersion:read.state.rulesVersion,repositories:read.state.repositories,currentRun:read.state.currentRun,stageRuns:read.state.stageRuns,outcome:read.state.outcome,next:read.state.next,updatedAt:read.state.updatedAt});
    } catch(error) {issues.push({directory,reason:error.code??error.message});}
  }
  return {root:path.resolve(root),records,issues,limits:'Named root immediate children only. Records may be stale; unknown roots and non-Aimship work are outside this check. Agent must assess actual writing intent and checkout/worktree identity.'};
}
