import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {nativeDelivery} from '../scripts/testing/native-delivery.mjs';
import {approveFixture} from '../scripts/testing/reviews.mjs';
import {reviewFingerprint} from '../lib/approvals.mjs';
import {renderState} from '../lib/state.mjs';
import {generatedArea,strippedGenerated} from '../lib/projections.mjs';

const body=(c,kind)=>fs.readFile(path.join(c.dir,kind+'.md'),'utf8');
const artifact=(view,kind)=>view.artifacts.find(a=>a.path===kind+'.md');
async function finish(c){const impl=await c.implement('B-001');await c.review({batchId:'B-001'});await c.review({reviewScope:'overall'});await c.verify();return impl;}

test('all finite views describe the same saved revision without counting repair as a business batch',async t=>{
 const c=await nativeDelivery(t),impl=await c.implement('B-001'),failed=await c.review({batchId:'B-001',result:'failed'});
 const repair=await c.implement('B-001',{workType:'repair',repairOf:[failed.id]});
 await c.review({batchId:'B-001',reviewOf:[impl.id,repair.id],historyResultRefs:[failed.resultRef]});
 await c.review({reviewScope:'overall'});await c.verify();
 assert.equal(c.state.writeResult.view.status,'current');
 const read=await c.read(),status=await body(c,'status');
 assert.match(status,/Business batches complete: 1\/1/);assert.match(status,new RegExp('State revision: '+c.state.revision+'(?:\\D|$)'));
 for(const kind of ['plan','testing','review']){
  const area=generatedArea(await body(c,kind),kind);assert.equal(area.count,1);
  assert.match(area.body,new RegExp('Saved state revision: '+c.state.revision+'\\.'));
  assert.equal(artifact(c.state.writeResult.view,kind).revision,c.state.revision);
 }
 assert.equal(read.execution.batches.length,1);assert.equal(read.execution.batches[0].implementationIds.length,2);
 assert.equal(read.execution.verification.passed,true);
});

test('generated refresh and ordinary execution notes preserve approved content and AI prose',async t=>{
 const c=await nativeDelivery(t),docs=c.state.documents.filter(d=>['plan','testing'].includes(d.kind));
 const digests=await Promise.all(docs.map(d=>reviewFingerprint(c.dir,c.state,d))),history=structuredClone(c.state.reviewHistory);
 await c.append('plan','execution','### Synthetic development note\n\nHuman-readable design reasoning must survive every generated refresh.');
 await c.append('testing','runs','### Synthetic environment note\n\nFormal RUN evidence is separate from this descriptive preparation note.');
 const before=Object.fromEntries(await Promise.all(['plan','testing','review'].map(async kind=>[kind,strippedGenerated(await body(c,kind),kind)])));
 await c.implement('B-001');
 assert.equal(c.state.writeResult.view.status,'current');
 for(const kind of ['plan','testing','review'])assert.equal(strippedGenerated(await body(c,kind),kind),before[kind]);
 assert.deepEqual(await Promise.all(docs.map(d=>reviewFingerprint(c.dir,c.state,d))),digests);assert.deepEqual(c.state.reviewHistory,history);
});

test('manual generated edits protect the view but preserve saved facts and render recovery never replays records',async t=>{
 const c=await nativeDelivery(t);await finish(c);
 const file=path.join(c.dir,'plan.md'),raw=await body(c,'plan'),area=generatedArea(raw,'plan');
 const modified=raw.slice(0,area.bodyStart)+'\n\nManual generated summary edit.\n\n'+raw.slice(area.end);
 await fs.writeFile(file,modified);
 const before=c.state.revision,ids=c.state.stageRuns.map(r=>r.id);
 await c.save({next:{action:'Inspect protected summary'}});
 assert.equal(c.state.revision,before+1);assert.equal(c.state.writeResult.stateSaved,true);assert.equal(c.state.writeResult.view.status,'protected');
 assert.equal(artifact(c.state.writeResult.view,'plan').status,'protected');assert.equal(await fs.readFile(file,'utf8'),modified);
 const rendered=await renderState(c.dir,c.state.revision,c.version,c.runtime,true),plan=artifact(rendered.view,'plan');
 assert.equal(rendered.stateSaved,false);assert.equal(rendered.view.status,'current');assert.ok(plan.preservedPath);
 assert.equal(await fs.readFile(plan.preservedPath,'utf8'),modified);
 const read=await c.read();assert.equal(read.state.revision,c.state.revision);assert.deepEqual(read.state.stageRuns.map(r=>r.id),ids);
 assert.equal(strippedGenerated(await body(c,'plan'),'plan'),strippedGenerated(modified,'plan'));
 assert.equal((await body(c,'review')).match(/### REV-\d{3}/g).length,2);assert.equal((await body(c,'testing')).match(/### RUN-\d{3}/g).length,1);
});

for(const mode of ['missing','duplicate'])test(`a ${mode} owned H3 is reported without adding or migrating sections`,async t=>{
 const c=await nativeDelivery(t),file=path.join(c.dir,'plan.md'),raw=await body(c,'plan'),area=generatedArea(raw,'plan');
 const edited=mode==='missing'?raw.replace('### '+area.title,'### User summary'):raw+'\n### '+area.title+'\n\nPending state generation.\n';
 await fs.writeFile(file,edited);
 const rendered=await renderState(c.dir,c.state.revision,c.version,c.runtime,true);
 assert.equal(artifact(rendered.view,'plan').reason,mode==='missing'?'GENERATED_SECTION_MISSING':'DUPLICATE_GENERATED_SECTION');
 assert.equal(await fs.readFile(file,'utf8'),edited);assert.equal((await c.read()).state.revision,c.state.revision);
});

test('a pinned approval evidence file is never overwritten by projection regeneration',async t=>{
 const c=await nativeDelivery(t),before=await body(c,'plan'),records=await approveFixture(c.dir,c.state,['prd.md']);
 await c.op(...records.slice(c.state.reviewHistory.length).map(record=>({type:'record-review',record:{...record,sourceRef:'plan.md'}})));
 assert.equal(c.state.writeResult.stateSaved,true);assert.equal(artifact(c.state.writeResult.view,'plan').reason,'APPROVAL_EVIDENCE_SOURCE');
 assert.equal(await body(c,'plan'),before);assert.deepEqual((await c.read()).review.evidenceIssues,[]);
 const rendered=await renderState(c.dir,c.state.revision,c.version,c.runtime,true);
 assert.equal(artifact(rendered.view,'plan').reason,'APPROVAL_EVIDENCE_SOURCE');assert.equal(await body(c,'plan'),before);
});

test('a status write failure preserves business facts and allows other document views to refresh',async t=>{
 const c=await nativeDelivery(t),file=path.join(c.dir,'status.md');await fs.rm(file);await fs.mkdir(file);
 const before=c.state.revision,impl=await c.implement('B-001');
 assert.equal(c.state.revision,before+1);assert.equal(c.state.writeResult.stateSaved,true);assert.equal(c.state.writeResult.view.status,'error');
 assert.equal(c.state.writeResult.view.statusView.status,'error');
 for(const kind of ['plan','testing','review'])assert.equal(artifact(c.state.writeResult.view,kind).status,'current');
 const read=await c.read();assert.ok(read.state.stageRuns.some(r=>r.id===impl.id));assert.equal(read.state.revision,c.state.revision);
 await fs.rm(file,{recursive:true});const rendered=await renderState(c.dir,c.state.revision,c.version,c.runtime,true);
 assert.equal(rendered.view.status,'current');assert.equal((await c.read()).state.revision,c.state.revision);
});
