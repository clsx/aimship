// Synthetic current-stage scenarios, not a replay of a real host conversation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {nativeDelivery} from '../scripts/testing/native-delivery.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';

const cli=fileURLToPath(new URL('../bin/aimship.mjs',import.meta.url));
function inspect(c,command){
  const result=spawnSync(process.execPath,[cli,command,c.dir,'--rules-version',c.version],{encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(result.stdout).data;
}
async function pendingDesign(t){
  const c=await nativeDelivery(t),doc=(await c.read()).review.documents.find(d=>d.path==='tech-design.md');
  await c.op({type:'record-review',record:{id:'design-feedback',kind:'changes-requested',document:doc.path,version:doc.version,digest:doc.digest,sourceRef:'source/decision.md',summary:'Synthetic request to refine the current design; not implementation approval.'}});
  const history=await approveFixture(c.dir,c.state,['tech-design.md']);
  await c.op(...history.slice(c.state.reviewHistory.length).filter(r=>r.kind==='self-check').map(record=>({type:'record-review',record})),{type:'record-run',run:{id:'design-discussion',stage:'tech-design',scope:'Synthetic current design refinement',progress:'active',inputRefs:['prd.md'],outputRefs:['tech-design.md']}});
  return c;
}

test('current design readiness and a successful check do not release a new implementation start',async t=>{
  const c=await pendingDesign(t),resume=inspect(c,'resume'),checked=inspect(c,'check');
  assert.equal(resume.currentRun.id,'design-discussion');assert.equal(resume.canProceed,true);
  assert.equal(checked.structure,'valid');assert.equal(checked.semantics,'not-checked');
  assert.equal(checked.review.documents.find(d=>d.path==='tech-design.md').status,'pending');
  const file=path.join(c.dir,'.aimship/state.json'),before=await fs.readFile(file);
  await assert.rejects(c.op({type:'record-run',run:{id:'premature-implementation',stage:'implement',scope:'Synthetic implementation attempt',progress:'active',workType:'batch',batchId:'B-001',inputRefs:['plan.md#TASK-001'],outputRefs:['plan.md']}}),e=>e.code==='REVIEW_CHECK');
  assert.deepEqual(await fs.readFile(file),before);
  assert.equal(c.state.currentRun,'design-discussion');assert.ok(!c.state.stageRuns.some(r=>r.id==='premature-implementation'));
});

test('pending design discussion continues in its active record without creating another stage or approval',async t=>{
  const c=await pendingDesign(t),runs=structuredClone(c.state.stageRuns),history=structuredClone(c.state.reviewHistory);
  await c.save({next:{action:'Refine the proposed route in the current design document',inputRefs:['tech-design.md']}});
  const read=await c.read();assert.equal(read.state.currentRun,'design-discussion');assert.equal(read.review.canProceed,true);
  assert.deepEqual(c.state.stageRuns,runs);assert.deepEqual(c.state.reviewHistory,history);
  assert.equal(read.review.documents.find(d=>d.path==='tech-design.md').status,'pending');
});

test('an authorized batch with current prerequisites starts normally and continues using the same active run',async t=>{
  const c=await nativeDelivery(t),history=structuredClone(c.state.reviewHistory),count=c.state.stageRuns.length;
  await c.op({type:'record-run',run:{id:'authorized-implementation',stage:'implement',scope:'Synthetic authorized B-001',progress:'active',workType:'batch',batchId:'B-001',inputRefs:['plan.md#TASK-001'],outputRefs:['plan.md']}});
  let read=await c.read();assert.equal(read.state.currentRun,'authorized-implementation');assert.equal(read.review.canProceed,true);
  const active=structuredClone(c.state.stageRuns.find(r=>r.id==='authorized-implementation'));
  await c.save({next:{action:'Continue the same authorized batch and its local checks',inputRefs:['plan.md#TASK-001']}});
  read=await c.read();assert.equal(read.review.canProceed,true);assert.equal(c.state.stageRuns.length,count+1);
  assert.deepEqual(c.state.stageRuns.find(r=>r.id==='authorized-implementation'),active);
  assert.deepEqual(c.state.reviewHistory,history);
});
