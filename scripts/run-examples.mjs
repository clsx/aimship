// Executable, disposable commissions. No installed release or user delivery is used.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {nativeDelivery} from './testing/native-delivery.mjs';
import {hash,json} from '../lib/io.mjs';
import {checkReferences} from '../lib/state.mjs';
import {inspectDocuments} from '../lib/documents.mjs';

const requested=path.resolve(process.argv[2]??'synthetic-output');
await fs.mkdir(requested,{recursive:false});
const output=await fs.realpath(requested);
const t={after(){}}; // The caller-selected output is the durable evidence artifact.
const results=[];
async function assertions(checks){const rows=[];for(const [name,check] of checks){try{await check();rows.push({name,result:'passed'});}catch(error){rows.push({name,result:'failed',message:error.message});}}return rows;}
async function setup(name,batches){
 const c=await nativeDelivery(t,{batchCount:batches,caseCount:2,baseDirectory:path.join(output,name)});
 const code=path.join(c.base,'code');await fs.mkdir(code);
 await c.save({repositories:[{id:'app',path:code,role:'Synthetic local implementation; exact source hashes bind review and RUN.'}]});
 await fs.writeFile(path.join(c.dir,'source/original-request.md'),'# Synthetic original request\n\nExport exact nonnegative safe-integer selected-order totals. Keep this source unchanged.\n');
 const sourceDigest=hash(await fs.readFile(path.join(c.dir,'source/original-request.md')));
 const object=async()=>hash(JSON.stringify(await Promise.all((await fs.readdir(code)).sort().map(async f=>[f,hash(await fs.readFile(path.join(code,f)))]))));
 return {c,code,object,sourceDigest};
}
async function evidence(c,file,record){const target=path.join(c.dir,'.aimship/evidence',file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,json(record));return '.aimship/evidence/'+file;}
async function finish(context,run){
 const {c,sourceDigest}=context;
 await c.handoff();await c.op({type:'record-outcome',outcome:{goal:'met',goalConclusionRef:'handoff.md#outcomes'}});
 const read=await c.read();assert.equal(read.completion.readyForAcceptance,true);assert.equal(read.completion.standardComplete,false);assert.equal(c.state.outcome.acceptance,'not-recorded');
 assert.deepEqual((await inspectDocuments(c.dir,c.state)).issues,[]);
 assert.ok((await checkReferences(c.dir,c.state,true)).every(r=>['exists','not-checked'].includes(r.status)));
 assert.equal(hash(await fs.readFile(path.join(c.dir,'source/original-request.md'))),sourceDigest);
 const record={directory:c.dir,revision:c.state.revision,batches:read.execution.batches.map(b=>({id:b.id,status:b.status})),overall:read.execution.overall,verification:read.execution.verification,run,readyForAcceptance:true,userAcceptance:'not-recorded'};
 results.push(record);return record;
}

const one=await setup('single-batch',1);
await fs.writeFile(path.join(one.code,'export.mjs'),"export function selectedTotal(prices){if(!Array.isArray(prices)||prices.some(p=>!Number.isSafeInteger(p)||p<0))throw new RangeError('Invalid cents');return prices.reduce((sum,p)=>sum+p,0);}\n");
const o1=await one.object();await one.c.implement('B-001',{objectKey:o1});await one.c.review({batchId:'B-001',objectKey:o1});
await one.c.review({reviewScope:'overall',objectKey:o1});
const total=(await import(pathToFileURL(path.join(one.code,'export.mjs')).href)).selectedTotal;
const singleRows=await assertions([['selected exact totals',()=>assert.equal(total([101,200]),301)],['empty selection',()=>assert.equal(total([]),0)],['invalid negative/fraction/unsafe',()=>{for(const p of [-1,0.1,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>total([p]),RangeError);}]]);
assert.ok(singleRows.every(r=>r.result==='passed'));
const singleEvidence=await evidence(one.c,'formal-run.json',{objectKey:o1,command:'node scripts/run-examples.mjs <output>',node:process.version,coverageRefs:one.c.caseRefs,results:singleRows});
await one.c.append('testing','runs','Actual local assertions and exact object: ['+singleEvidence+']('+singleEvidence+').');
const oneRun=await one.c.verify({objectKey:o1});const summary1=await finish(one,oneRun.id);

const two=await setup('multi-batch',2);
await fs.writeFile(path.join(two.code,'validate.mjs'),"export function validate(prices){if(!Array.isArray(prices)||prices.some(p=>!Number.isSafeInteger(p)||p<0))throw new RangeError('Invalid cents');}\n");
await two.c.implement('B-001',{objectKey:await two.object()});await two.c.review({batchId:'B-001',objectKey:await two.object()});
const quoteSource=extra=>`import {validate} from './validate.mjs'; export function quote(prices){validate(prices);return prices.reduce((a,b)=>a+b,0)${extra};}\n`;
await fs.writeFile(path.join(two.code,'quote.mjs'),quoteSource('+1'));
await two.c.implement('B-002',{objectKey:await two.object()});await two.c.review({batchId:'B-002',objectKey:await two.object()});
const failedReview=await two.c.review({reviewScope:'overall',result:'failed',objectKey:await two.object()});
const before=await fs.readFile(path.join(two.c.dir,'.aimship/state.json'));
await assert.rejects(two.c.record({id:'blocked-formal-test',stage:'verify',scope:'Must wait for passing overall review',progress:'active',coverageRefs:two.c.caseRefs,objectKey:await two.object(),inputRefs:['testing.md'],outputRefs:['testing.md']}),{code:'REVIEW_CHECK'});
assert.deepEqual(await fs.readFile(path.join(two.c.dir,'.aimship/state.json')),before);
const gate={attemptedStage:'verify',rejectedWith:'REVIEW_CHECK',stateUnchanged:true,formalVerificationExecuted:false};
const probeQuote=(await import(pathToFileURL(path.join(two.code,'quote.mjs')).href+'?v=1')).quote;
const probe=await assertions([['exact total catches seeded defect',()=>assert.equal(probeQuote([101]),101)]]);assert.equal(probe[0].result,'failed');
await evidence(two.c,'negative-probe.json',{purpose:'Maintainer fault probe, not a formal RUN',objectKey:await two.object(),results:probe});
await fs.writeFile(path.join(two.code,'quote.mjs'),quoteSource(''));const o2=await two.object();
await two.c.record({id:'overall-repair',stage:'implement',scope:'Repair overall exact-total defect',workType:'repair',repairOf:[failedReview.id],objectKey:o2,inputRefs:[failedReview.resultRef],outputRefs:['plan.md'],resultRef:'plan.md#execution'});
await two.c.review({reviewScope:'overall',objectKey:o2,historyResultRefs:[failedReview.resultRef]});
const quote=(await import(pathToFileURL(path.join(two.code,'quote.mjs')).href+'?v=2')).quote;
const multiRows=await assertions([['integrated exact totals',()=>assert.equal(quote([101,200]),301)],['empty selection',()=>assert.equal(quote([]),0)],['negative cents',()=>assert.throws(()=>quote([-1]),RangeError)],['fractional cents',()=>assert.throws(()=>quote([0.1]),RangeError)],['unsafe cents',()=>assert.throws(()=>quote([Number.MAX_SAFE_INTEGER+1]),RangeError)]]);assert.ok(multiRows.every(r=>r.result==='passed'));
const multiEvidence=await evidence(two.c,'formal-run.json',{objectKey:o2,command:'node scripts/run-examples.mjs <output>',node:process.version,coverageRefs:two.c.caseRefs,results:multiRows});
await two.c.append('testing','runs','Actual integrated local assertions: ['+multiEvidence+']('+multiEvidence+').');
const twoRun=await two.c.verify({objectKey:o2});const summary2=await finish(two,twoRun.id);
assert.equal(summary2.batches.length,2,'An overall repair does not create a third business batch.');
const report={version:one.c.version,protocolVersion:2,output,one:summary1,two:summary2,verificationGate:gate,execution:{single:singleRows,multiMaintainerNegativeProbe:probe,multiFormalVerification:multiRows},limits:'Scripted synthetic local behavior and actual Node assertions; no real AI-host, Windows host, UI, network, deployment or user acceptance claim.',completed:true};
await fs.writeFile(path.join(output,'summary.json'),json(report));console.log(json(report));
