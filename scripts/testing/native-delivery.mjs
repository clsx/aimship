// Current-protocol synthetic deliveries. These decisions and results are fixture
// facts, never evidence of a real user approval, code review, or test execution.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initState, updateState, readState} from '../../lib/state.mjs';
import {artifactMap, sections} from '../../lib/documents.mjs';
import {hash} from '../../lib/io.mjs';
import {PROTOCOL_VERSION} from '../../lib/protocol.mjs';
import {generatedArea} from '../../lib/projections.mjs';
import {documentFixture} from './documents.mjs';
import {approveFixture} from './reviews.mjs';

const sourceRoot=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
export const nativeObjectKey=hash('Synthetic selected-order export object; no real repository.');

export async function nativeDelivery(t,{batchCount=1,caseCount=2,language='en',initPatch={},initializeOnly=false,baseDirectory}={}) {
  const base=await fs.realpath(baseDirectory?(await fs.mkdir(baseDirectory),baseDirectory):await fs.mkdtemp(path.join(os.tmpdir(),'aimship-native-domain-')));
  if(!baseDirectory)t.after(()=>fs.rm(base,{recursive:true,force:true}));
  const dir=path.join(base,'delivery');
  await fs.mkdir(path.join(dir,'.aimship'),{recursive:true});
  await fs.mkdir(path.join(dir,'source'));
  await fs.writeFile(path.join(dir,'.aimship/init.md'),'# Synthetic commission\n\nImplement the selected-order export through review, verification and handoff in this disposable directory.\n');
  await fs.writeFile(path.join(dir,'source/decision.md'),'# Synthetic decisions\n\nFixture-only authority: complete the recorded scope and accept its synthetic handoff. Not a real user decision.\n');
  const version=JSON.parse(await fs.readFile(path.join(sourceRoot,'package.json'),'utf8')).version;
  const runtime={version,activeVersion:version,protocolVersion:PROTOCOL_VERSION,dataRoot:base};
  const map=await artifactMap();
  const kinds=['prd','tech-design','testing','plan','review','handoff','change-log'];
  for(const kind of kinds)await fs.writeFile(path.join(dir,kind+'.md'),await documentFixture(kind,language));
  const batchIds=Array.from({length:batchCount},(_,i)=>`B-${String(i+1).padStart(3,'0')}`);
  const taskIds=batchIds.map((_,i)=>`TASK-${String(i+1).padStart(3,'0')}`);
  const caseRefs=Array.from({length:caseCount},(_,i)=>`testing.md#TC-${String(i+1).padStart(3,'0')}`);

  async function setSection(kind,id,content) {
    const file=path.join(dir,kind+'.md'),body=await fs.readFile(file,'utf8');
    const area=sections(body,map.documents[kind]).find(s=>s.id===id);
    if(area?.count!==1)throw new Error(`Synthetic fixture section ${kind}.${id} missing.`);
    const generated=generatedArea(body,kind);
    const start=generated.count===1&&generated.start>area.start&&generated.end<area.end?body.indexOf('\n',generated.end)+1:body.indexOf('\n',area.start)+1;
    await fs.writeFile(file,body.slice(0,start)+'\n'+content+'\n\n'+body.slice(area.end));
  }
  async function append(kind,id,content) {
    const file=path.join(dir,kind+'.md'),body=await fs.readFile(file,'utf8');
    const area=sections(body,map.documents[kind]).find(s=>s.id===id);
    if(area?.count!==1)throw new Error(`Synthetic fixture section ${kind}.${id} missing.`);
    await fs.writeFile(file,body.slice(0,area.end)+'\n'+content+'\n\n'+body.slice(area.end));
  }
  async function change(id,content){await append('change-log','changes',`### ${id} — Synthetic scoped change\n\n${content}`);return `change-log.md#${id}`;}
  await setSection('plan','batches',batchIds.map((id,i)=>`| ${id} | Export work ${i+1}; ${i?'depends on '+batchIds[i-1]:'no prior business batch'}; complete ${taskIds[i]}. |`).join('\n'));
  await setSection('plan','tasks',taskIds.map((id,i)=>`| ${id} | ${batchIds[i]} | Implement scoped selected-order export for REQ-001 / AC-001; preserve exact totals. |`).join('\n'));
  await setSection('testing','cases',caseRefs.map((ref,i)=>`| ${ref.split('#')[1]} | AC-001 | Select ${i+1} orders and compare each exported total with its stored value. |`).join('\n'));

  const documents=kinds.map(kind=>({kind,path:kind+'.md',mode:'new',version:'1'}));
  let state=await initState(dir,{
    language,storage:{mode:'explicit',decisionRef:'.aimship/init.md'},
    goal:{summary:'Synthetic selected-order export',endpoint:'Reviewed, independently verified local implementation and handoff'},
    goalRef:'prd.md',documentPolicy:{authority:'authored',interaction:false,prototypeCovered:false,interface:'none',databases:[]},
    documents,stageRuns:[],currentRun:null,...initPatch
  },version,runtime);
  let serial=0,rev=0,run=0;
  const save=async patch=>state=await updateState(dir,patch,state.revision,version,runtime);
  const op=async(...operations)=>save({operations});
  async function approve(files) {
    const records=await approveFixture(dir,state,files);
    return op(...records.slice(state.reviewHistory.length).map(record=>({type:'record-review',record})));
  }
  async function record(record) {
    const id=record.id??`native-${++serial}`;
    return op({type:'record-run',run:{id,scope:'Synthetic '+record.stage,progress:'done',result:'passed',inputRefs:[],outputRefs:[],...record}});
  }
  async function implement(batchId,extra={}) {
    const id=extra.id??`implement-${++serial}`;
    await record({id,stage:'implement',scope:'Synthetic implementation for '+batchId,workType:'batch',batchId,
      objectKey:nativeObjectKey,inputRefs:['plan.md#tasks'],outputRefs:['plan.md'],resultRef:'plan.md#execution',...extra});
    return state.stageRuns.find(r=>r.id===id);
  }
  async function review({reviewScope='batch',batchId,reviewOf,result='passed',objectKey=nativeObjectKey,...extra}={}) {
    const number=`REV-${String(++rev).padStart(3,'0')}`,id=extra.id??`review-${number}`;
    const covered=reviewOf??state.stageRuns.filter(r=>r.stage==='implement' && (reviewScope==='overall'||r.batchId===batchId)).map(r=>r.id);
    await append('review','reviews',`### ${number} — Synthetic ${reviewScope} assessment\n\nCurrent object ${objectKey}. Reviewed ${covered.join(', ')} against the approved requirement, design and plan. Result ${result}. ${result==='passed'?'No unresolved findings in this synthetic record.':'A synthetic finding remains unresolved; repair and recheck this scope.'}`);
    await record({id,stage:'review',scope:'Synthetic '+reviewScope+' review',reviewScope,...(batchId?{batchId}:{}),reviewOf:covered,
      objectKey,result,inputRefs:['plan.md'],outputRefs:['review.md'],resultRef:'review.md#'+number,...extra});
    return state.stageRuns.find(r=>r.id===id);
  }
  async function verify({coverageRefs=caseRefs,result='passed',objectKey=nativeObjectKey,...extra}={}) {
    const number=`RUN-${String(++run).padStart(3,'0')}`,id=extra.id??`verify-${number}`;
    await append('testing','runs',`### ${number} — Synthetic formal execution\n\nObject ${objectKey}. Coverage ${coverageRefs.join(', ')}. Result ${result}; this is a state fixture, not an actual engineering test. Expected exact selected-order totals; the fixture records the stated observed result.`);
    await record({id,stage:'verify',scope:'Synthetic agreed verification coverage',coverageRefs,objectKey,result,
      inputRefs:['testing.md'],outputRefs:['testing.md'],resultRef:'testing.md#'+number,...extra});
    return state.stageRuns.find(r=>r.id===id);
  }
  async function handoff(extra={}) {
    await record({id:'native-handoff',stage:'handoff',scope:'Synthetic goal handoff',inputRefs:['testing.md','review.md'],outputRefs:['handoff.md'],resultRef:'handoff.md#outcomes',...extra});
    return state.stageRuns.find(r=>r.id==='native-handoff');
  }
  const c={dir,base,version,runtime,batchIds,taskIds,caseRefs,save,op,approve,record,implement,review,verify,handoff,append,setSection,change,
    read:()=>readState(dir),get state(){return state}};
  if(initializeOnly)return c;
  // Follow actual design responsibilities and synthetic current-content approvals.
  for(const [id,stage,kind,section] of [
    ['native-requirements','requirements','prd','requirements'],['native-design','tech-design','tech-design','coverage'],
    ['native-cases','test-design','testing','cases'],['native-plan','plan','plan','tasks']
  ]) {
    await record({id,stage,scope:'Synthetic '+stage+' basis',outputRefs:[kind+'.md'],resultRef:kind+'.md#'+section});
    await approve([kind+'.md']);
  }
  await op({type:'register-batches',batches:batchIds.map((id,i)=>({id,definitionRef:'plan.md#'+id,taskRefs:['plan.md#'+taskIds[i]],dependsOn:i?[batchIds[i-1]]:[]}))});
  return c;
}
