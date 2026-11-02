import { text, displayValue } from './language.mjs';
import {phaseOf,phaseOrder} from './domains.mjs';
import {generatedKinds,generatedArea,initialGeneratedBody,projectionText} from './projections.mjs';
import { completionStatus, sessionAdvice } from './delivery.mjs';
import fs from 'node:fs/promises';
import { reviewStatus } from './approvals.mjs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite, exists, hash, json, readJSON, noSymlinks } from './io.mjs';
import { resolveRef, documentChanges } from './documents.mjs';

const paths = dir => ({ view: path.join(dir,'status.md'), meta: path.join(dir,'.aimship/view.json') });
async function metadata(directory){
 const p=paths(directory);await noSymlinks(p.meta);return await exists(p.meta)?readJSON(p.meta):null;
}
const recovery=state=>text(state,'Render at the current revision; do not replay the saved business update. Preserve modified generated content before rebuilding.','按当前修订重新生成；不要重放已保存的业务更新。重建前保留改动过的生成内容。');
async function inspectStatus(directory,state,meta){
 const p=paths(directory);await noSymlinks(p.view);
 if(!await exists(p.view))return {path:'status.md',status:'missing'};
 const raw=await fs.readFile(p.view,'utf8');
 if(!meta||meta.deliveryId!==state.deliveryId||hash(raw)!==meta.hash)return {path:'status.md',status:'modified'};
 return {path:'status.md',status:meta.revision===state.revision?'current':'stale',revision:meta.revision};
}
async function inspectProjection(directory,state,doc,meta){
 await noSymlinks(path.join(directory,doc.path));
 if(!await exists(path.join(directory,doc.path)))return {path:doc.path,status:'missing',reason:'DOCUMENT_MISSING'};
 const raw=await fs.readFile(path.join(directory,doc.path),'utf8'),area=generatedArea(raw,doc.kind);
 if(area.count!==1)return {path:doc.path,status:'error',reason:area.reason??(area.count?'DUPLICATE_GENERATED_SECTION':'GENERATED_SECTION_MISSING')};
 const record=meta?.deliveryId===state.deliveryId?meta.artifacts?.[doc.path]:null;
 if(!record)return {path:doc.path,status:initialGeneratedBody(area.body)?'missing':'modified'};
 if(record.hash!==hash(area.body))return {path:doc.path,status:'modified'};
 return {path:doc.path,status:record.revision===state.revision?'current':'stale',revision:record.revision};
}
const projectionDocs=state=>state.documents.filter(d=>d.mode==='new'&&generatedKinds.includes(d.kind));
const aggregate=items=>['error','modified','missing','stale'].find(s=>items.some(x=>x.status===s))??'current';
export async function viewStatus(directory,state){
 try{
  const meta=await metadata(directory),statusView=await inspectStatus(directory,state,meta),artifacts=[];
  for(const doc of projectionDocs(state))artifacts.push(await inspectProjection(directory,state,doc,meta));
  const status=aggregate([statusView,...artifacts]);
  return {status,revision:meta?.revision,statusView,artifacts,recovery:status==='current'?null:recovery(state)};
 }catch(error){return {status:'error',reason:error.code??error.message,recovery:recovery(state)};}
}
const cell = x => String(x ?? 'not recorded').replaceAll('|','\\|').replaceAll('\n',' ');
const link = ref => `[${ref.replaceAll('[','\\[').replaceAll(']','\\]')}](${ref.split('#')[0].replaceAll(' ','%20').replaceAll('(','%28').replaceAll(')','%29')})`;
async function available(directory,state,ref) {
  if (/^https?:\/\//.test(ref)) return true;
  const p=resolveRef(directory,state,ref); return p && await exists(p);
}
// One responsibility per main-stage row; internal review and repair facts stay
// in the relevant batch view.
const batchReview=(_state,r)=>r.stage==='review'&&r.reviewScope==='batch';
export function derivedNextAction(state,review,{changed=[]}={}){
 const t=(en,zh)=>text(state,en,zh),model=review.execution;
 if(state.next.questionRef)return t('Resolve the recorded question before its dependent work.','先解决已记录问题，再推进依赖它的工作。');
 if(changed.length||review.evidenceIssues.length)return t('Reconcile the changed material or review evidence.','核对变化的资料或审核依据。');
 if(review.pending.length)return t('Review or correct the current document content.','审核或修订当前文档内容。');
 const current=state.stageRuns.find(r=>r.id===state.currentRun),s=review.runs.find(r=>r.id===current?.id);
 if(current&&(s?.blockedBy.length||current.progress==='blocked'||['needs-review','unknown'].includes(current.applicability)))return t('Resolve the current dependency or affected scope.','处理当前依赖或受影响范围。');
 if(state.deliveryPolicy.partialRef){
  if(current?.stage==='review'&&['failed','mixed','unknown'].includes(current.result)&&!s?.resolvedBy)return t('Resolve the cited review within the agreed limited scope.','在约定限定范围内处理所引审查。');
  return s?.ready?t('Stop at the saved scope boundary and assess the result against the agreed limited goal.','在已保存的范围边界停止，对照约定限定目标核对结果。'):t('Complete the current agreed limited scope and its recorded dependencies.','完成当前约定限定范围及其已记录依赖。');
 }
 if(model.batches.some(b=>b.status==='needs-repair'))return t('Repair and recheck the affected batch within its authorized scope.','在已授权范围内修复并复查受影响批次。');
 if(model.batches.some(b=>b.status==='await-review'))return t('Complete this batch review and authorized repairs before its batch stop.','完成本批审查及授权内修复，再在批次边界停止。');
 if(current?.stage==='review'&&['failed','mixed','unknown'].includes(current.result)&&!s?.resolvedBy)return t('Resolve the cited review and recheck its actual scope.','处理所引审查，并按实际范围复查。');
 if(model.batches.length&&model.batches.every(b=>b.status==='complete')){
  if(!model.overall)return t('Summarize implementation and stop. Start the existing overall review in a new session, or here when explicitly requested.','汇总实施结果后停止；建议新会话执行已有整体审查，明确要求时可在当前会话继续。');
  if(model.verification.coverage.some(c=>['failed','mixed'].includes(c.result)))return t('Resolve the cited verification failures and retest their actual coverage after the necessary repair review.','处理所引验证失败，在必要的修复审查后按实际覆盖重测。');
  if(!model.verification.passed)return t('Prepare the actual test environment and perform separate formal verification; inspect the current coverage below.','准备实际测试环境并独立正式验证；核对下方当前覆盖。');
  if(!state.stageRuns.some(r=>r.stage==='handoff'&&review.runs.find(x=>x.id===r.id)?.ready))return t('Prepare the handoff from the current review and verification results.','依据当前审查和验证结果准备交接。');
  return state.outcome.acceptance==='accepted'?t('Assess the recorded delivery conclusion.','核对已记录的交付结论。'):t('Review the handoff and record the actual user acceptance.','审核交接并记录实际用户验收。');
 }
 if(current?.stage==='review'&&current.reviewScope==='batch'&&s?.releaseReady)return t('This batch is complete. Stop before starting the next authorized batch.','本批已完成；在开始下一授权批次前停止。');
 if(current?.stage==='plan'&&s?.releaseReady)return t('The plan is approved. Start only the agreed implementation batch.','计划已批准；只开始约定的实施批次。');
 if(current?.stage==='implement')return t('Finish this authorized batch and its batch review; stop before the next batch.','完成当前授权批次及批审，在下一批前停止。');
 return t('Continue the current agreed stage after its required review or continuation.','在所需审核或继续指令后接续当前约定阶段。');
}
export async function renderText(directory,state,snapshot) {
  const t=(en,zh)=>text(state,en,zh), v=x=>cell(displayValue(state,x));
  const artifactLink=ref=>ref.startsWith('repo:')
    ? `[${cell(ref.split('#')[0])}](${encodeURI(resolveRef(directory,state,ref)).replaceAll('(','%28').replaceAll(')','%29')})`
    : link(ref.split('#')[0]);
  const review=snapshot?.review??await reviewStatus(directory,state), changed=snapshot?.changed??await documentChanges(directory,state);
  const completion=completionStatus(state,review,{changed}), session=sessionAdvice(directory,state,review);
  const current=state.stageRuns.find(r=>r.id===state.currentRun) ?? state.stageRuns.at(-1);
  const currentReview=review.runs.find(r=>r.id===current?.id);
  const humanDocs=review.documents.filter(d=>currentReview?.documents.includes(d.path));
  const failed=r=>['failed','mixed'].includes(r.result);
  const progress=r=> {
    const check=review.runs.find(x=>x.id===r.id), resolved=check?.resolvedBy;
    if(r.progress==='planned')return t('Not started','尚未开始');
    if(r.id===state.currentRun && state.next.questionRef)return t('Awaiting clarification','待确认具体问题');
    if(r.progress==='blocked' || check?.blockedBy.length || ['needs-review','unknown'].includes(r.applicability))return t('Needs attention','需要处理');
    if(failed(r) && !resolved)return t('Result needs resolution','结果待处理');
    if(r.result==='unknown' && !resolved)return t('Result not yet known','结果尚未确定');
    if(r.result==='not-run' && !resolved)return t('Not run','未执行');
    if(r.stage==='review' && r.progress==='done' && !r.result && !resolved)return t('Review result not recorded','审查结果未记录');
    if(check?.documents.some(file=>['self-check-failed','changes-requested','evidence-changed','unavailable'].includes(review.documents.find(d=>d.path===file)?.status)))return t('Needs revision or checking','需要修改或核对');
    if(r.progress==='done' && check?.waiting.length)return check.waiting.every(file=>review.documents.find(d=>d.path===file)?.input)?t('Input check pending','输入材料待核对'):t('Document prepared; awaiting review','文档已完成，待审核');
    if(r.progress==='done' && check?.documents.length && check.documents.every(file=>review.documents.find(d=>d.path===file)?.status==='adopted'))return t('Provided material adopted','已采用现有材料');
    return r.progress==='done'?t('Completed','已完成'):t('In progress','进行中');
  };
  const standaloneReview=!!state.deliveryPolicy.partialRef&&!review.execution.batches.length;
  const phaseName=stage=>stage==='review' && !standaloneReview?t('Overall review','整体审查'):v(stage);
  const runName=r=>batchReview(state,r)?t('implement · Batch review','实施 · 批次审查'):phaseName(r.stage);
  const phaseProgress=stage=> {
    const runs=state.stageRuns.filter(r=>phaseOf(r)===stage&&!review.runs.find(x=>x.id===r.id)?.resolvedBy);
    if(stage==='implement'&&review.execution.batches.length){
      const batches=review.execution.batches,complete=batches.filter(b=>b.status==='complete').length;
      return t(`Business batches complete: ${complete}/${batches.length}`,`业务批次完成 ${complete}/${batches.length}`)+(batches.some(b=>['needs-repair','needs-review','blocked'].includes(b.status))?t('; needs attention','；需要处理'):'');
    }
    if(stage==='review'&&review.execution.overall)return t('Completed','已完成');
    if(stage==='verify'&&review.execution.verification.passed)return t('Completed','已完成');
    if(!runs.length||runs.every(r=>r.progress==='planned'))return stage==='contract'&&(state.documentPolicy.interface===null||state.documentPolicy.databases===null)?t('Applicability to be determined during design','待技术设计确认是否适用'):t('Not started','尚未开始');
    if(stage==='verify')return t('Coverage incomplete; see current testing results','覆盖尚未完成；见当前测试结果');
    const pending=runs.filter(r=>r.progress!=='planned'&&!review.runs.find(x=>x.id===r.id)?.releaseReady);
    if(pending.length)return progress(pending.find(r=>r.id===state.currentRun)??pending.at(-1));
    if(runs.some(r=>r.progress==='planned'))return t('In progress','进行中');
    if(stage==='review'&&!standaloneReview)return t('Review required for current implementation','当前实施待整体审查');
    return runs.every(r=>progress(r)===t('Provided material adopted','已采用现有材料'))?t('Provided material adopted','已采用现有材料'):t('Completed','已完成');
  };
  const kinds={frame:['prd'],requirements:['prd'],prototype:['prototype'],diagnose:['diagnosis'],'tech-design':['tech-design'],contract:['contract','sql'],'test-design':['testing'],plan:['plan'],implement:['plan'],review:['review'],verify:['testing'],handoff:['handoff']};
  const stageFiles=new Set();
  for(const stage of phaseOrder(state)){
    for(const doc of state.documents.filter(d=>kinds[stage]?.includes(d.kind)))if(await available(directory,state,doc.path))stageFiles.add(doc.path);
    for(const ref of state.stageRuns.filter(r=>r.stage==='contract'&&stage==='contract').flatMap(r=>r.outputRefs)){const file=ref.split('#')[0];if(file&&!file.includes('/')&&await available(directory,state,file))stageFiles.add(file);}
  }
  // Registered formal entries also appear in adopted-material navigation when
  // no selected main-stage row owns them. Do not link those twice above it.
  for(const doc of state.documents)if(!doc.path.startsWith('.aimship/')&&await available(directory,state,doc.path))stageFiles.add(doc.path);
  const workRefs=[...new Set(state.next.inputRefs??[])].filter(ref=>ref!=='.aimship/init.md'&&!stageFiles.has(ref.split('#')[0]));
  const lines=[t('# Delivery progress','# 交付进度'),'',cell(state.goal.summary),'',t('## Current stage and your next action','## 当前阶段与用户操作'),''];
  lines.push(`${t('Current stage','当前阶段')}: ${current?runName(current):v('requirements preparation')}${current?' · '+progress(current):''}`);
  for(const d of humanDocs)lines.push(`- ${artifactLink(d.path)} ${cell(d.version)} · ${d.selfCheck?t('Self-check recorded as passed','自检记录通过'):t('Self-check pending','待自检')} · ${v(d.status)}`);
  lines.push('',`${t('Next action','下一步')}: ${cell(derivedNextAction(state,review,{changed}))}`);
  if(workRefs.length)lines.push('',`${t('Work references','待办依据')}: ${workRefs.map(artifactLink).join('; ')}`);
  if(session.action==='await-review')lines.push('',t('Review the document above and approve it or give feedback.','请查看上方文档，通过或反馈修改。'));
  if(state.next.questionRef)lines.push('',`${t('Question and impact','问题与影响')}: ${artifactLink(state.next.questionRef)}`);
  const problems=[];
  if(current && current.progress!=='planned') {
    if(current.progress==='blocked')problems.push(cell(current.scope));
    if(currentReview?.blockedBy.length)problems.push(t('Current prerequisites need completion or approval.','当前前置工作需要完成或批准。'));
    if(failed(current) && !currentReview?.resolvedBy)problems.push(t('Resolve the recorded unsuccessful result before advancing.','请先处理当前未通过的结果，再推进。'));
    if(['unknown','not-run'].includes(current.result) && !currentReview?.resolvedBy && !state.next.questionRef)problems.push(current.result==='unknown'?t('The current result is not yet known; follow the recorded next action.','当前结果尚未确定，请按已记录的下一步处理。'):t('The current work has not been run; follow the recorded next action.','当前工作尚未执行，请按已记录的下一步处理。'));
    if(['needs-review','unknown'].includes(current.applicability))problems.push(t('Reassess the affected current work.','请复核当前受影响的工作。'));
  }
  for(const ref of changed)problems.push(`${t('Changed or missing material','材料已变化或缺失')}: ${artifactLink(ref)}`);
  for(const c of state.openChanges.filter(c=>c.status==='open'))problems.push(`${t('Open change','待处理变更')}: ${artifactLink(c.ref)}`);
  if(review.evidenceIssues.length)problems.push(t('Recorded review evidence needs checking.','已记录的审核依据需要核对。'));
  if(problems.length)lines.push('',t('## Items to resolve','## 当前待处理事项'),'',...problems.map(p=>'- '+p));
  const refs=new Map(), used=new Set();
  const names={testing:t('Test cases and results','用例与结果'),sql:'SQL',prd:t('Requirements','需求依据'),source:t('Source material','来源材料'),prototype:t('Prototype','原型')};
  for(const d of state.documents)if(!d.path.startsWith('.aimship/'))refs.set(d.path,`${names[d.kind]??v(d.kind)} · ${cell(d.version)}`);
  for(const ref of state.stageRuns.filter(r=>r.stage==='contract').flatMap(r=>r.outputRefs)) {
    const file=ref.split('#')[0];
    if(file && !file.includes('/') && !refs.has(file))refs.set(file,t('Additional contract','补充契约'));
  }
  const artifacts=async stage=> {
    const entries=new Map();
    for(const d of state.documents.filter(d=>kinds[stage]?.includes(d.kind)))entries.set(d.path,d.path);
    const runs=state.stageRuns.filter(r=>phaseOf(r)===stage && !review.runs.find(x=>x.id===r.id)?.resolvedBy);
    for(const ref of runs.flatMap(r=>r.outputRefs))if(refs.has(ref.split('#')[0]))entries.set(ref.split('#')[0],ref);
    const latest=runs.findLast(r=>r.progress==='done' && r.resultRef);
    if(latest && refs.has(latest.resultRef.split('#')[0]))entries.set(latest.resultRef.split('#')[0],latest.resultRef);
    const links=[];
    for(const [file,ref] of entries)if(await available(directory,state,file)){used.add(file);links.push(artifactLink(file)+(ref.includes('#')?' · '+cell(ref.split('#')[1]):''));}
    return links.join('; ') || t('Not yet recorded','尚未记录');
  };
  lines.push('',t('## Delivery progress','## 整体进度'),'',t('| Stage | Artifact or result | Status |','| 阶段 | 成果 | 状态 |'),'| --- | --- | --- |');
  for(const stage of phaseOrder(state))lines.push(`| ${phaseName(stage)} | ${await artifacts(stage)} | ${phaseProgress(stage)} |`);
  lines.push('',`${t('Delivery conclusion','交付结论')}: ${v(completion.status)}`);
  // Full completion diagnostics matter at handoff, not as a list of early-stage defects.
  if(current?.stage==='handoff' || state.outcome.goal==='met')lines.push(...completion.gaps.map(g=>'- '+cell(g)));
  if(state.outcome.acceptance!=='not-recorded')lines.push(`${t('User acceptance','用户验收')}: ${v(state.outcome.acceptance)}`);
  if(state.outcome.mergeRef)lines.push(`${t('Merge record','合并记录')}: ${artifactLink(state.outcome.mergeRef)}`);
  if(state.outcome.deploymentRef)lines.push(`${t('Deployment record','部署记录')}: ${artifactLink(state.outcome.deploymentRef)}`);
  lines.push('',t('## Goal and adopted materials','## 目标与采用材料'),'',`${t('Endpoint','交付终点')}: ${cell(state.goal.endpoint??t('To be confirmed','待确认'))}`);
  if(state.documentPolicy.interface===null || state.documentPolicy.databases===null)lines.push('',t('Interface/database applicability will be determined during technical design.','接口／数据库适用性待技术设计确认。'));
  for(const [ref,role] of refs)if(!used.has(ref) && await available(directory,state,ref))lines.push(`- ${role}: ${artifactLink(ref)}`);
  if(state.repositories.length) {
    lines.push('',t('## Associated engineering','## 关联工程'),'',t('| Object | Location | Role |','| 工程 | 位置 | 用途 |'),'| --- | --- | --- |');
    for(const r of state.repositories)lines.push(`| ${cell(r.id)} | ${cell(r.path)} | ${cell(r.role)} |`);
  }
  lines.push('',t('## Saved information','## 保存信息'),'',`${t('Delivery directory','交付目录')}: ${cell(path.resolve(directory))}`,`${t('Delivery','交付')}: ${state.deliveryId}`,`${t('State revision','状态修订')}: ${state.revision}`,`${t('Rules','规则版本')}: ${state.rulesVersion}`,`${t('State saved','状态保存时间')}: ${state.updatedAt}`,'',t('Generated from saved state and document checks. Update the formal records, not this page. Recorded results are not independent proof of execution.','由保存状态和文档检查生成；请更新正式记录，不手改本页。记录结果不等于独立验证了实际执行。'),'');
  return lines.join('\n');
}
export async function generateView(directory,state,preserveEdits=false){
 const p=paths(directory),results=[],metaBase={deliveryId:state.deliveryId,artifacts:{}};
 let meta;
 try{meta=await metadata(directory);}catch(error){
  if(!preserveEdits||error.code!=='INVALID_JSON')return {status:'error',reason:error.code??error.message,recovery:recovery(state)};
  try{await noSymlinks(p.meta);await atomicWrite(path.join(directory,'.aimship',`view-metadata-edits-${randomUUID()}.json`),await fs.readFile(p.meta));meta=null;}catch(cause){return {status:'error',reason:cause.code??cause.message,recovery:recovery(state)};}
 }
 if(meta?.deliveryId===state.deliveryId)Object.assign(metaBase,meta,{artifacts:{...meta.artifacts}});
 const review=await reviewStatus(directory,state),changed=await documentChanges(directory,state),snapshot={review,changed};
 async function preserve(file,raw,label){const target=path.join(directory,'.aimship',`${label}-edits-${randomUUID()}.md`);await atomicWrite(target,raw);return target;}
 let statusView;
 try{
  const diagnostic=await inspectStatus(directory,state,meta);let preservedPath;
  if(diagnostic.status==='modified'){
   if(!preserveEdits)statusView={...diagnostic,status:'protected'};
   else preservedPath=await preserve(p.view,await fs.readFile(p.view),'status');
  }
  if(!statusView){const body=await renderText(directory,state,snapshot);await atomicWrite(p.view,body);metaBase.hash=hash(body);metaBase.revision=state.revision;statusView={path:'status.md',status:'current',revision:state.revision,...(preservedPath?{preservedPath}:{})};}
 }catch(error){statusView={path:'status.md',status:'error',reason:error.code??error.message};}
 for(const doc of projectionDocs(state)){
  try{
   const diagnostic=await inspectProjection(directory,state,doc,meta),file=path.join(directory,doc.path);
   if(diagnostic.status==='error'||diagnostic.reason==='DOCUMENT_MISSING'){results.push(diagnostic);continue;}
   const raw=await fs.readFile(file,'utf8'),area=generatedArea(raw,doc.kind),body=projectionText(state,review,doc.kind);let preservedPath;
   if(body===area.body){metaBase.artifacts[doc.path]={hash:hash(body),revision:state.revision};results.push({path:doc.path,status:'current',revision:state.revision});continue;}
   // A sourceDigest pins the entire source file, including its generated area.
   // Never change that evidence, even when asked to preserve manual view edits.
   if(state.reviewHistory.some(r=>r.sourceDigest&&r.sourceRef.split('#')[0]===doc.path)){results.push({path:doc.path,status:'protected',reason:'APPROVAL_EVIDENCE_SOURCE'});continue;}
   if(diagnostic.status==='modified'){
    if(!preserveEdits){results.push({...diagnostic,status:'protected'});continue;}
    preservedPath=await preserve(file,raw,doc.kind);
   }
   if(await fs.readFile(file,'utf8')!==raw){results.push({path:doc.path,status:'protected',reason:'CONTENT_CHANGED_DURING_RENDER'});continue;}
   await atomicWrite(file,raw.slice(0,area.bodyStart)+body+raw.slice(area.end));
   metaBase.artifacts[doc.path]={hash:hash(body),revision:state.revision};
   results.push({path:doc.path,status:'current',revision:state.revision,...(preservedPath?{preservedPath}:{})});
  }catch(error){results.push({path:doc.path,status:'error',reason:error.code??error.message});}
 }
 try{await atomicWrite(p.meta,json(metaBase));}catch(error){return {status:'error',reason:error.code??error.message,statusView,artifacts:results,recovery:recovery(state)};}
 const failed=[statusView,...results].filter(r=>r.status!=='current'),status=failed.some(r=>r.status==='error')?'error':failed.length?'protected':'current';
 return {status,revision:state.revision,statusView,artifacts:results,...(failed.length?{recovery:recovery(state)}:{})};
}
export async function savedResult(directory,state,{initialized=false}={}){
 const view=await generateView(directory,state),review=await reviewStatus(directory,state);
 return {...state,writeResult:{stateSaved:true,revision:state.revision,view,receipt:{status:view.status==='current'?'saved':'view-repair-required',deliveryId:state.deliveryId,directory:path.resolve(directory),statePath:path.join(path.resolve(directory),'.aimship/state.json'),statusPath:view.statusView?.status==='current'?path.join(path.resolve(directory),'status.md'):null,rulesVersion:state.rulesVersion,currentStage:state.stageRuns.find(r=>r.id===state.currentRun)?.stage??(state.goalRef==='.aimship/init.md'?'requirements preparation':null),nextAction:derivedNextAction(state,review),repositoryCount:state.repositories.length,...(initialized?{workspaceHint:text(state,`Add ${path.resolve(directory)} to your current project/workspace; ignore this if already added.`,`请将「${path.resolve(directory)}」添加到当前项目／工作空间；已添加则忽略。`)}:{})},session:sessionAdvice(directory,state,review,{saved:view.status==='current'})}};
}
