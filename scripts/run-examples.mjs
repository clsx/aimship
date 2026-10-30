// Executable synthetic commissions. Output is caller-selected; never touches installed releases.
import fs from 'node:fs/promises';
import { approveFixture } from './testing/reviews.mjs';
import { reviewStatus, reviewFingerprint } from '../lib/approvals.mjs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { initState, updateState, readState, checkReferences } from '../lib/state.mjs';
import { inspectDocuments, sections as documentSections } from '../lib/documents.mjs';
import { json, hash } from '../lib/io.mjs';
const source=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await fs.readFile(path.join(source,'package.json'))).version;
const map=JSON.parse(await fs.readFile(path.join(source,'skills/aimship/references/artifact-map.json')));
const requestedOutput=path.resolve(process.argv[2]??'synthetic-output');
await fs.mkdir(requestedOutput,{recursive:false});
const output=await fs.realpath(requestedOutput);
const runtime={version,activeVersion:version,dataRoot:output};
const definition=(id,refs=[])=>`### ${id} — ${refs.length?'References: '+refs.join(', '):'Record'}\n\n`;
async function makeDoc(dir,kind,parts) {
 const sections=map.documents[kind].sections;
 await fs.writeFile(path.join(dir,`${kind}.md`),`# ${kind}\n\nSynthetic commission; document revision 1. Delivery identity: pending init.\n\n`+sections.map((id,i)=>`## ${map.documents[kind].headings.en[i]}\n\n${parts[id]??'Not applicable to this bounded commission; no additional work authorized.'}\n`).join('\n'));
}
async function begin(name,authority,requirements,prdParts) {
 const dir=path.join(output,name),code=path.join(output,`${name}-code`);await fs.mkdir(path.join(dir,'source'),{recursive:true});await fs.mkdir(code);
 await fs.mkdir(path.join(dir,'.aimship'),{recursive:true});await fs.writeFile(path.join(dir,'.aimship/init.md'),requirements);
 if(authority==='adopted'){await fs.writeFile(path.join(dir,'source/catalog-v1.md'),'# Catalog PRD v1\nREQ-001: Sum safe nonnegative integer prices in cents. No discount in v1.\n');await fs.writeFile(path.join(dir,'source/prototype-v1.html'),'<html><body><p>Catalog total (adopted reference, outside UI implementation scope).</p></body></html>');}

 const kind='prd';await makeDoc(dir,kind,prdParts);
 const input={language:'en',goal:{summary:name==='single-batch'?'Normalize duplicate input lines':'Validate prices and quote discounted totals',endpoint:'Local implementation, review, independent verification and handoff'},goalRef:`${kind}.md`,documentPolicy:{authority,interaction:false,prototypeCovered:false,interface:'none',databases:[]},documents:[{kind,path:`${kind}.md`,mode:'new',version:'1'}],repositories:[{id:'app',path:code,role:'Authorized synthetic implementation; no Git, exact file hashes recorded'}],stageRuns:[],next:{action:'Create technical design; no UI, HTTP or database changes'}};
 const initNotes=`# Initialization\n\n## Original commission\n\n${requirements}\n\n## Working context\n\nLanguage: en.\nMaterials: ${authority==='adopted'?'adopted PRD/prototype copies in source/.':'the original commission above.'}\nEndpoint: ${input.goal.endpoint}.\n`;
 await fs.writeFile(path.join(dir,'.aimship/init.md'),initNotes);
 let state=await initState(dir,input,version,runtime);
 const body=await fs.readFile(path.join(dir,`${kind}.md`),'utf8');await fs.writeFile(path.join(dir,`${kind}.md`),body.replace('pending init',state.deliveryId));
 const c={dir,code,kind,state,initNotes};
 c.save=async patch=>{c.state=await updateState(dir,patch,c.state.revision,version,runtime);assert.equal(c.state.writeResult.view.status,'current');};
 c.addDoc=async(kind,parts)=>{await makeDoc(dir,kind,parts);const file=path.join(dir,`${kind}.md`);await fs.writeFile(file,(await fs.readFile(file,'utf8')).replace('pending init',c.state.deliveryId));await c.save({documents:[...c.state.documents,{kind,path:`${kind}.md`,mode:'new',version:'1'}]});};
 c.run=async(id,stage,result,scope,extra={})=>{
  const refs=stage==='implement'?['plan.md#tasks',`${kind}.md`]:[`${kind}.md`]; const artifact=result.split('#')[0];
  const old=c.state.stageRuns.find(r=>r.id===id);
  const record={id,stage,scope,progress:'done',inputRefs:refs,outputRefs:[artifact],resultRef:result,result:'passed',applicability:'current',...extra,...(old?{historyResultRefs:[...new Set([...(old.historyResultRefs??[]),old.resultRef])]}:{})};
  await c.save({stageRuns:old?c.state.stageRuns.map(r=>r.id===id?record:r):[...c.state.stageRuns,record],currentRun:id,next:{action:`Saved ${id}; follow the selected review stop`}});
  if(map.stages[stage].humanReview) {
   const status=await reviewStatus(dir,c.state);assert.ok(status.runs.find(r=>r.id===id).waiting.includes(artifact));
   await c.save({reviewHistory:await approveFixture(dir,c.state,[artifact]),next:{action:'Synthetic explicit approval recorded; continue at the synthetic driver’s explicit request'}});
  }
 };
 c.reconcile=async()=>{
  const files=[`${kind}.md`,'tech-design.md','testing.md','plan.md'];
  const docs=[];for(const d of c.state.documents){const last=c.state.reviewHistory.filter(r=>r.document===d.path && r.kind==='approved').at(-1);docs.push(files.includes(d.path)&&last&&last.digest!==await reviewFingerprint(dir,c.state,d)?{...d,version:String(Number(d.version)+1)}:d);}
  const draft={...c.state,documents:docs};
  await c.save({documents:docs,reviewHistory:await approveFixture(dir,draft,files)});
  await c.save({stageRuns:c.state.stageRuns.map(r=>({...r,applicability:r.id==='review-REV-002'?'needs-review':'current'})),next:{action:'CHG impact assessed: unchanged validator reviewed as current, affected quote review pending; synthetic document reapprovals retained.'}});
 };
 c.append=async(file,text)=>{
  const target=path.join(dir,file); let body=await fs.readFile(target,'utf8');
  const section={'plan.md':text.startsWith('CHG-001 changes TASK-')?'tasks':'execution','review.md':'reviews','testing.md':text.startsWith('### TC-')?'cases':'runs','prd.md':'requirements','tech-design.md':'architecture','change-log.md':'changes'}[file];
  const kind=file.slice(0,-3), record=documentSections(body,map.documents[kind]).find(r=>r.id===section);
  const end=record?.end??-1;
  await fs.writeFile(target,end<0?body+`\n${text}\n`:body.slice(0,end)+`\n${text}\n\n`+body.slice(end));
 };
 c.object=async()=>Object.fromEntries(await Promise.all((await fs.readdir(code)).map(async f=>[f,hash(await fs.readFile(path.join(code,f)))])));
 await c.run('requirements','requirements',`${kind}.md#requirements`,'current requirement authority');
 return c;
}
async function design(c,text) {await c.addDoc('tech-design',{basis:`[Current commission](${c.kind}.md). Repository app; existing structure empty.`,architecture:text+' Validate before returning a result in one synchronous call, with no shared mutable state.',modules:'app | engine module | new | current requirements; pure deterministic functions with no external effects.',data:'No HTTP contract, database, schema or SQL change.',errors:'Reject invalid input before returning a result; no writes or external service. Verify with the specified function assertions; the harness measures the commissioned benchmark later.',risks:'No Git repository needed for the commission. Exact source hashes bind review and RUN; this is not a release.',coverage:`[Requirements and acceptance](${c.kind}.md) (search: acceptance).`});await c.run('design','tech-design','tech-design.md#coverage','whole design');}
async function plan(c,tasks,batches) {await c.addDoc('plan',{basis:`[Requirements](${c.kind}.md) and [design](tech-design.md). Only app paths authorized.`,batches, tasks,validation:'Implement each batch → batch review. All batches → overall review → independent verify. Tests written with implementation; no batch test gate.',execution:'No task executed yet; planned work above remains unchanged.',remaining:'No known external dependencies; no deployment/merge authorized.'});await c.run('plan','plan','plan.md#tasks','all batches before implementation');}
async function testing(c,cases) {await c.addDoc('testing',{basis:`[Acceptance](${c.kind}.md) (search: acceptance) and bounded risks.`,environment:`Node ${process.version}; isolated local modules, synthetic data, no accounts/network.`,cases,coverage:'Each AC is referenced by the explicit TC definition. Execute all local unit/boundary checks together after overall review; keep failures and append retests.',runs:'Not executed.',conclusion:'No execution conclusion yet.'});await c.run('test-design','test-design','testing.md#cases','cases and grouped execution arrangement');}
async function review(c,id,scope,task='TASK-001',{result='passed',historyResultRefs=[]}={}) {
 if(!c.state.documents.some(d=>d.kind==='review'))await c.addDoc('review',{basis:'Current scope/design/plan and exact app file hashes below.',reviews:'Review records appended below.',conclusion:'Findings and dispositions belong to their recorded objects.'});
 const run=id==='REV-003' && c.state.stageRuns.some(r=>r.id==='review-REV-002' && r.applicability==='needs-review')?'review-REV-002':`review-${id}`;await c.append('review.md',definition(id,[task],{run})+`Reviewer: current Agent's scripted synthetic review. Scope: ${scope}. Objects: ${JSON.stringify(await c.object())}. Checked planned inputs, validation boundaries, requirements and module integration by reading source; no runtime claim. Findings: ${result==='failed'?'The deliberately seeded floor/half-up mismatch is a known blocking fault; implementation is not accepted and formal verification must not start.':'No unresolved blocking finding in this reviewed scope.'} Runtime conclusions remain for authorized verification.`);
 const batches=c.state.stageRuns.filter(r=>r.stage==='implement').map(r=>r.id), overall=/overall|repair/.test(scope);
 await c.run(run,'review',`review.md#${id}`,scope,{reviewOf:overall?batches:batches.slice(-1),overall,result,...(historyResultRefs.length?{historyResultRefs}:{})});
}
async function runAssertions(tests) {
 const results=[];for(const [name,fn] of tests){try{await fn();results.push({name,result:'passed'});}catch(error){results.push({name,result:'failed',message:error.message});}}
 return results;
}
async function negativeProbe(c,tests,refs) {
 const record={purpose:'Independent maintainer fault probe; not an authorized verification stage or RUN.',executor:'Node assertion harness',command:'node scripts/run-examples.mjs <isolated-output>',node:process.version,objects:await c.object(),cases:refs,results:await runAssertions(tests)};
 await fs.mkdir(path.join(c.dir,'.aimship/evidence'),{recursive:true});
 await fs.writeFile(path.join(c.dir,'.aimship/evidence/negative-probe.json'),json(record));
 return record;
}
async function execute(c,id,tests,refs) {
 const results=await runAssertions(tests);
 await fs.mkdir(path.join(c.dir,'.aimship/evidence'),{recursive:true});const evidence=`.aimship/evidence/${id.toLowerCase()}.json`;
 const record={id,executor:'Node assertion harness, authored and inspected by current Agent',command:`node scripts/run-examples.mjs <isolated-output>`,node:process.version,objects:await c.object(),cases:refs,results};await fs.writeFile(path.join(c.dir,evidence),json(record));
 const run=`verify-${id}`;await c.append('testing.md',definition(id,refs,{run})+`Object hashes and testing document version, commands, exact assertions/results: [${id}](${evidence}). ${results.filter(r=>r.result==='passed').length} passed; ${results.filter(r=>r.result==='failed').length} failed; 0 skipped. All source objects have hashes; no Git assumed.`);
 await c.save({stageRuns:[...c.state.stageRuns,{id:run,stage:'verify',historyResultRefs:results.every(r=>r.result==='passed')?c.state.stageRuns.filter(r=>r.stage==='verify').map(r=>r.resultRef):[],scope:'independent post-overall review execution',progress:'done',inputRefs:['testing.md#cases','review.md'],outputRefs:['testing.md'],resultRef:`testing.md#${id}`,result:results.every(r=>r.result==='passed')?'passed':'failed',applicability:'current'}],currentRun:run,outcome:{goal:results.every(r=>r.result==='passed')?'in-progress':'not-met'},next:{action:results.every(r=>r.result==='passed')?'Assess goal and handoff':'Repair failing implementation, review affected scope, then retest'}});
 return record;
}
async function finish(c) {
 await c.addDoc('handoff',{goals:`[Requirements/AC](${c.kind}.md) (search: acceptance): all current assertions passed in the latest RUN; earlier failures retained.`,artifacts:`[Plan](plan.md), [testing](testing.md), [review](review.md), [design](tech-design.md). app actual path is in status. No Git; source hashes ${JSON.stringify(await c.object())}. No pre-existing changes.`,usage:'Import the exported function from the app module; source and runnable assertions accompany the example harness.',results:'See testing for actual Node assertions, versions, evidence and retained failures. No UI, HTTP or real host acceptance claimed.',limits:'Synthetic local case only. Host discovery, cross-host continuation and original HTTP/UI acceptance remain unverified.',outcomes:'Goal met for this synthetic commission. User acceptance, merge and deployment not recorded. No package release.'});
 await c.run('handoff','handoff','handoff.md#outcomes','current goal handoff');await c.save({outcome:{goal:'met',goalConclusionRef:'handoff.md#goals',handoffRef:'handoff.md#outcomes'},currentRun:null,next:{action:'Synthetic local goal complete; preserve results'}});
 for(const doc of c.state.documents.filter(d=>d.mode==='new' && d.path.endsWith('.md'))) assert.doesNotMatch(await fs.readFile(path.join(c.dir,doc.path),'utf8'),/<a\s+id=|aimship:def|(?:REQ|AC|TC|TASK|B|REV|RUN)-[0-9]+@[0-9]+/,`Plain Markdown output: ${doc.path}`);
 const check=await inspectDocuments(c.dir,c.state);assert.deepEqual(check.issues,[]);const refs=await checkReferences(c.dir,c.state,true);assert.ok(refs.every(r=>['exists','not-checked'].includes(r.status)),JSON.stringify(refs));
 assert.equal(await fs.readFile(path.join(c.dir,'.aimship/init.md'),'utf8'),c.initNotes);assert.ok(c.initNotes.includes(c.request));
 for(const forbidden of ['implementation.md','test-plan.md','verification.md','results.md','INDEX.md','docs','sql'])assert.equal(await fs.stat(path.join(c.dir,forbidden)).then(()=>true,()=>false),false);
 return {directory:path.basename(c.dir),revision:c.state.revision,goal:c.state.outcome.goal,documents:check,referenceCount:refs.length};
}
const request1='Build a pure line normalizer: trim each line, omit blanks, preserve first occurrence order. Reject non-string input. Local implementation through verification only.';
const one=await begin('single-batch','authored',request1,{info:'Original [request](.aimship/init.md), revision 1; synthetic user instruction.',goals:'Normalize pasted line lists without I/O. Non-goals: UI, persistence, networking.',scope:'app/normalize.mjs only; one batch, then review/verify/handoff; no release.',requirements:definition('REQ-001',['AC-001'])+'REQ-001 | functional | string input | trim, omit blanks, stable distinct lines | output array | invalid type throws TypeError | .aimship/init.md | AC-001',states:'Pure function; invalid input throws with no side effects, retry with a string.',acceptance:definition('AC-001')+'AC-001 | REQ-001 | duplicates, blanks, empty string, invalid type | normalize | expected stable list/empty list/TypeError.',arrangement:'requirements → tech-design → test-design → plan → implement one batch → combined batch+overall review → verify → handoff. No prototype/API/SQL needed.'});one.request=request1;
await design(one,'Split on LF; trim, drop empty, Set preserves insertion order. Reject non-string before splitting.');
await testing(one,definition('TC-001',['AC-001'])+'TC-001 | functional/unit | import module | normalize whitespace/duplicates, empty input, invalid number | [a,b], [], TypeError | Node assertions in harness.');
await plan(one,definition('TASK-001',['REQ-001'])+'TASK-001 | B-001 | REQ-001/AC-001 | app | normalize.mjs | pure normalization | explicit errors and stable output | planned',definition('B-001')+'Batch: no dependencies; one module.');
await fs.writeFile(path.join(one.code,'normalize.mjs'),`export function normalize(value) { if(typeof value!=='string') throw new TypeError('Expected text'); return [...new Set(value.split('\\n').map(x=>x.trim()).filter(Boolean))]; }\n`);
await one.append('plan.md','TASK-001 / B-001 done. Actual normalize.mjs implemented; no deviation; exact hash '+JSON.stringify(await one.object()));await one.run('implement-1','implement','plan.md#execution','B-001');await review(one,'REV-001','B-001 and overall integration');
const normalize=(await import(pathToFileURL(path.join(one.code,'normalize.mjs')))).normalize;
const run1=await execute(one,'RUN-001',[['stable distinct',()=>assert.deepEqual(normalize(' a\nb\na\n '),['a','b'])],['empty',()=>assert.deepEqual(normalize(''),[])],['type error',()=>assert.throws(()=>normalize(1),TypeError)]],['TC-001']);assert.ok(run1.results.every(r=>r.result==='passed'));
const summary1=await finish(one);
const request2='Adopt the supplied catalog PRD v1. Implement validation then totals in two batches, with per-batch review, overall review and independent verification. Synthetic change CHG-001 later adds discount with half-up rounding; source stays read-only.';
const two=await begin('adopted-multibatch','adopted',request2,{info:'Adopt source/catalog-v1.md unchanged, source/prototype-v1.html is an existing visual reference. No interaction implementation in scope.',goals:'app validators + quote module, local verified implementation only.',scope:'Partial adoption with local validation, access and performance requirements; exclude UI, HTTP, databases and release.',requirements:definition('REQ-001',['AC-001'])+'REQ-001 → price totals (source/catalog-v1.md v1 §Total); adopted for this iteration.\n'+definition('REQ-002',['AC-002'])+'REQ-002 | shared rule | all modules | prices must be safe nonnegative integer cents, invalid throws RangeError.\n'+definition('REQ-003',['AC-003'])+'REQ-003 | permission | single supported role owner may quote, other roles rejected with Error.\n'+definition('REQ-004',['AC-004'])+'REQ-004 | performance | synthetic 10,000 quotes on local Node complete below 2 seconds; benchmark evidence only for this environment.',states:'Invalid prices and unauthorized roles reject before calculation; no persistent state.',acceptance:definition('AC-001')+'AC-001 total of [101,200] is 301 cents.\n'+definition('AC-002')+'AC-002 negative, fractional and unsafe cents rejected in validator and quote.\n'+definition('AC-003')+'AC-003 owner allowed; guest rejected before calculation.\n'+definition('AC-004')+'AC-004 10,000 bounded quotes below 2 seconds, record duration.',arrangement:'requirements, tech-design, test-design, plan, implement first batch/review, implement second batch/review, affected rework, overall review, verify, repair review/retest if needed, handoff.'});two.request=request2;

const sourceHash=hash(await fs.readFile(path.join(two.dir,'source/catalog-v1.md')));
await design(two,'Validator checks every price; quote authorizes role then sums. Shared validation exported by validate.mjs; quote.mjs imports it. No independent diagnosis: cause and solution are known.');
await testing(two,definition('TC-001',['AC-001','AC-002','AC-003','AC-004'])+'TC-001 | integration/boundary | owner + integer cents | total=301, reject -1/0.1/unsafe, reject guest, benchmark <2s. Node harness; not executed.');
await plan(two,definition('TASK-001',['REQ-002'])+'TASK-001 | B-001 | shared validation | app validate.mjs | reject unsafe cents | planned\n'+definition('TASK-002',['REQ-001','REQ-003','REQ-004'])+'TASK-002 | B-002 | totals/access/performance | app quote.mjs | correct cents and role | planned',definition('B-001')+'Validation first.\n'+definition('B-002',['B-001'])+'Quote depends on validation.');
await fs.writeFile(path.join(two.code,'validate.mjs'),`export function validate(prices) { if(!Array.isArray(prices)||prices.some(p=>!Number.isSafeInteger(p)||p<0)) throw new RangeError('Invalid cents'); }\n`);await two.append('plan.md','TASK-001 done; validate.mjs; no deviation.');await two.run('implement-1','implement','plan.md#execution','B-001 validation');await review(two,'REV-001','B-001 validation');
await fs.writeFile(path.join(two.code,'quote.mjs'),`import {validate} from './validate.mjs'; export function quote(prices,role='owner') { if(role!=='owner') throw new Error('Denied'); validate(prices); return prices.reduce((a,b)=>a+b,0); }\n`);await two.append('plan.md','TASK-002 done; quote.mjs integrates shared validator.');await two.run('implement-2','implement','plan.md#execution','B-002 quote');await review(two,'REV-002','B-002 totals','TASK-002');
// Explicit synthetic requirement change. Source remains unchanged and past review remains historical.
await two.addDoc('change-log',{changes:definition('CHG-001',['REQ-001','TASK-002'])+'Synthetic commission driver requests optional discount 0..50 percent with half-up cents. Prior total behavior lacked discount; update scope, design, TASK-002, TC-001 and affected reviews. Source PRD remains v1. REV-001 validator remains applicable.',remaining:'Rework quote, overall review then execute the revised testing document; prior cases not executed.'});
await two.save({openChanges:[{id:'CHG-001',ref:'change-log.md#CHG-001',status:'open'}],stageRuns:two.state.stageRuns.map(r=>r.id==='review-REV-002'?{...r,applicability:'needs-review'}:r),next:{action:'Apply CHG-001 to scope/design/plan/cases; preserve old review'}});
await two.append('prd.md',definition('REQ-005',['AC-005'])+'Discount extends the adopted requirement. Discount 0..50%; half-up rounded cents; reject outside bounds.\n'+definition('AC-005')+'Acceptance: 101 cents at 50% → 51; 0% unchanged, 51% rejected.\n'+definition('Q-001',['REQ-005'])+'Q-001 resolved by synthetic CHG-001 instruction: half-up rounding, now written into REQ-005 and design.');
await two.append('tech-design.md','CHG-001 / REQ-005: after validation and role check, sum then half-up round discounted cents. Reject discount outside [0,50].');await two.append('plan.md','CHG-001 changes TASK-002: add discount, preserving original plan and prior execution.');
let text=await fs.readFile(path.join(two.dir,'testing.md'),'utf8');
text=text.replace('TC-001 | integration/boundary', 'TC-001 | AC-005: also assert half-up 101*50%=51, discount bounds and zero discount | integration/boundary');
await fs.writeFile(path.join(two.dir,'testing.md'),text);
// Seeded defect: failed review must block formal verification. A separate
// maintainer probe preserves the genuine failing assertions without claiming a RUN.
const quoteSource=round=>`import {validate} from './validate.mjs'; export function quote(prices,role='owner',discount=0) { if(role!=='owner') throw new Error('Denied'); validate(prices); if(!Number.isFinite(discount)||discount<0||discount>50)throw new RangeError('Discount'); return Math.${round}(prices.reduce((a,b)=>a+b,0)*(100-discount)/100); }\n`;
await fs.writeFile(path.join(two.code,'quote.mjs'),quoteSource('floor'));await two.append('plan.md','TASK-002 change implemented with a known seeded rounding defect. Formal verification must wait for its repair and passing review.');await two.save({next:{action:'Review changed scope and resolve known rounding defect before independent verification'}});await two.reconcile();await review(two,'REV-003','overall across both batches after CHG-001','TASK-002',{result:'failed'});
const stateBefore=await fs.readFile(path.join(two.dir,'.aimship/state.json'));
const blockedVerification={id:'verify-blocked',stage:'verify',scope:'Must not start after failed overall review',progress:'active',inputRefs:['testing.md#cases','review.md'],outputRefs:['testing.md']};
await assert.rejects(two.save({stageRuns:[...two.state.stageRuns,blockedVerification],currentRun:blockedVerification.id}),{code:'REVIEW_CHECK'});
assert.deepEqual(await fs.readFile(path.join(two.dir,'.aimship/state.json')),stateBefore);
assert.ok(!two.state.stageRuns.some(r=>r.stage==='verify'));
const gate={attemptedStage:'verify',rejectedWith:'REVIEW_CHECK',revision:two.state.revision,stateUnchanged:true,formalVerificationExecuted:false};
await fs.mkdir(path.join(two.dir,'.aimship/evidence'),{recursive:true});await fs.writeFile(path.join(two.dir,'.aimship/evidence/blocked-verification.json'),json(gate));
const testsFor=fn=>[['total',()=>assert.equal(fn([101,200]),301)],['invalid cents',()=>{for(const p of [-1,0.1,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>fn([p]),RangeError);}],['permission',()=>assert.throws(()=>fn([100],'guest'),/Denied/)],['half up rounding',()=>assert.equal(fn([101],'owner',50),51)],['discount bounds',()=>assert.throws(()=>fn([100],'owner',51),RangeError)],['performance',()=>{const start=performance.now();for(let i=0;i<10000;i++)assert.equal(fn([1,2,3]),6);const elapsed=performance.now()-start;assert.ok(elapsed<2000,`${elapsed}ms`);}]];
let quote=(await import(pathToFileURL(path.join(two.code,'quote.mjs')).href+'?v=1')).quote;const failed=await negativeProbe(two,testsFor(quote),['TC-001']);assert.equal(failed.results.filter(r=>r.result==='failed').length,1);assert.equal(failed.results.find(r=>r.result==='failed').name,'half up rounding');assert.equal(failed.results.length,6);
assert.ok(!two.state.stageRuns.some(r=>r.stage==='verify'),'The maintainer negative probe is not a formal verification stage.');
await fs.writeFile(path.join(two.code,'quote.mjs'),quoteSource('round'));await two.append('plan.md','Repair TASK-002: Math.floor → Math.round to satisfy half-up requirement. The failed REV-003 and independent maintainer negative-probe.json retain the old object hash; no formal RUN occurred before repair.');await review(two,'REV-004','affected rounding repair plus all total boundary checks','TASK-002',{historyResultRefs:['review.md#REV-003']});quote=(await import(pathToFileURL(path.join(two.code,'quote.mjs')).href+'?v=2')).quote;const passed=await execute(two,'RUN-001',testsFor(quote),['TC-001']);assert.equal(passed.results.length,6);assert.ok(passed.results.every(r=>r.result==='passed'));
await two.append('change-log.md','CHG-001 complete: current scope/design/tasks/test cases aligned. Failed REV-003 and the independent maintainer negative probe remain as evidence; the blocked verification attempt saved no stage. Matching repair REV-004 and formal RUN-001 pass on the repaired hash. REV-002 remains historical through historyResultRefs; the same affected run locates failed REV-003, superseded by matching passing REV-004.');await two.save({openChanges:[{...two.state.openChanges[0],status:'closed'}]});assert.equal(hash(await fs.readFile(path.join(two.dir,'source/catalog-v1.md'))),sourceHash);
const summary2=await finish(two);
await fs.writeFile(path.join(output,'summary.json'),json({version,one:summary1,two:summary2,verificationGate:gate,execution:{single:run1.results,multiMaintainerNegativeProbe:failed.results,multiFormalVerification:passed.results},limits:'Scripted synthetic local behavior, not real AI-tool discovery or HTTP/UI acceptance. The negative probe is independent maintainer evidence, not an authorized verification stage or a failed formal RUN.'}));
console.log(json({output,version,single:run1.results.length,verificationGate:gate,multiMaintainerNegativeProbe:failed.results,multiFormalVerification:passed.results,completed:true}));
