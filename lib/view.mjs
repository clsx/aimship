import { text, displayValue } from './language.mjs';
import { completionStatus, sessionAdvice, suggestedNextStage } from './delivery.mjs';
import fs from 'node:fs/promises';
import { reviewStatus } from './approvals.mjs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite, exists, hash, json, readJSON, noSymlinks } from './io.mjs';
import { resolveRef, documentChanges } from './documents.mjs';

const paths = dir => ({ view: path.join(dir,'status.md'), meta: path.join(dir,'.aimship/view.json') });
export async function viewStatus(directory, state) {
  const t=(en,zh)=>text(state,en,zh);
  const p=paths(directory);
  try {
    if (!await exists(p.view)) return { status:'missing', recovery:t('Run render at the current revision.','使用当前修订重新生成视图。') };
    await noSymlinks(p.view); await noSymlinks(p.meta);
    if (!await exists(p.meta)) return { status:'modified', recovery:t('No trusted generation digest; preserve edits with render --preserve-edits.','没有可信的生成摘要；请保留手工修改后重新生成视图。') };
    const meta=await readJSON(p.meta), raw=await fs.readFile(p.view,'utf8');
    if (hash(raw)!==meta.hash) return { status:'modified', recovery:t('Inspect the edits, then render --preserve-edits.','先核对修改，再保留手工内容并重新生成视图。') };
    const current=meta.deliveryId===state.deliveryId && meta.revision===state.revision;
    return { status:current?'current':'stale', revision:meta.revision, recovery:current?null:t('Run render; do not replay the saved business update.','重新生成视图，不要重放已保存的业务更新。') };
  } catch(error) { return {status:'error',reason:error.code ?? error.message,recovery:t('Inspect view/metadata paths; preserve untrusted content before render.','核对视图和元数据路径，重新生成前保留现有内容。')}; }
}
const cell = x => String(x ?? 'not recorded').replaceAll('|','\\|').replaceAll('\n',' ');
const link = ref => `[${ref.replaceAll('[','\\[').replaceAll(']','\\]')}](${ref.split('#')[0].replaceAll(' ','%20').replaceAll('(','%28').replaceAll(')','%29')})`;
async function available(directory,state,ref) {
  if (/^https?:\/\//.test(ref)) return true;
  const p=resolveRef(directory,state,ref); return p && await exists(p);
}
export async function renderText(directory,state) {
  const t=(en,zh)=>text(state,en,zh), v=x=>cell(displayValue(state,x));
  const artifactLink=ref=>ref.startsWith('repo:')
    ? `[${cell(ref.split('#')[0])}](${encodeURI(resolveRef(directory,state,ref)).replaceAll('(','%28').replaceAll(')','%29')})`
    : link(ref.split('#')[0]);
  const review=await reviewStatus(directory,state), changed=await documentChanges(directory,state);
  const completion=completionStatus(state,review,{changed}), session=sessionAdvice(directory,state,review);
  const current=state.stageRuns.find(r=>r.id===state.currentRun) ?? state.stageRuns.at(-1);
  const currentReview=review.runs.find(r=>r.id===current?.id);
  const humanDocs=review.documents.filter(d=>currentReview?.documents.includes(d.path));
  const failed=r=>['failed','mixed','unknown','not-run'].includes(r.result);
  const progress=r=> {
    const check=review.runs.find(x=>x.id===r.id);
    if(r.progress==='planned')return t('Not started','尚未开始');
    if(r.progress==='blocked' || check?.blockedBy.length || ['needs-review','unknown'].includes(r.applicability))return t('Needs attention','需要处理');
    if(failed(r) && !check?.resolvedBy)return t('Result needs resolution','结果待处理');
    if(check?.documents.some(file=>['self-check-failed','changes-requested','evidence-changed','unavailable'].includes(review.documents.find(d=>d.path===file)?.status)))return t('Needs revision or checking','需要修改或核对');
    if(r.progress==='done' && check?.waiting.length)return t('Document prepared; awaiting review','文档已完成，待审核');
    return r.progress==='done'?t('Completed','已完成'):t('In progress','进行中');
  };
  const lines=[t('# Delivery progress','# 交付进度'),'',cell(state.goal.summary),'',t('## Current stage and your next action','## 当前阶段与用户操作'),''];
  lines.push(`${t('Current stage','当前阶段')}: ${v(current?.stage??'requirements preparation')}${current?' · '+progress(current):''}`);
  for(const d of humanDocs)lines.push(`- ${artifactLink(d.path)} ${cell(d.version)} · ${d.selfCheck?t('Self-check recorded as passed','自检记录通过'):t('Self-check pending','待自检')} · ${v(d.status)}`);
  lines.push('',`${t('Next action','下一步')}: ${cell(state.next.action)}`);
  if(session.action==='await-review')lines.push('',t('Review the current document and explicitly approve it or give feedback. Do not start the next stage while review is pending.','请审核当前材料，明确通过或反馈修改；待审期间不进入下一阶段。'));
  if(session.instruction)lines.push('',cell(session.instruction));
  const next=suggestedNextStage(state);
  if(next && current?.progress==='done' && !['resolve-current','finished','assess-outcome'].includes(session.action))lines.push('',`${t('After this stop','当前停点处理后')}: ${v(next)}${session.action==='await-review'?t(' (after approval)','（批准后）'):''}`);
  const problems=[];
  if(current && current.progress!=='planned') {
    if(current.progress==='blocked')problems.push(cell(current.scope));
    if(currentReview?.blockedBy.length)problems.push(t('Current prerequisites need completion or approval.','当前前置工作需要完成或批准。'));
    if(failed(current) && !currentReview?.resolvedBy)problems.push(t('Resolve the recorded unsuccessful result before advancing.','请先处理当前未通过的结果，再推进。'));
    if(['needs-review','unknown'].includes(current.applicability))problems.push(t('Reassess the affected current work.','请复核当前受影响的工作。'));
  }
  for(const ref of changed)problems.push(`${t('Changed or missing material','材料已变化或缺失')}: ${artifactLink(ref)}`);
  for(const c of state.openChanges.filter(c=>c.status==='open'))problems.push(`${t('Open change','待处理变更')}: ${artifactLink(c.ref)}`);
  if(review.evidenceIssues.length)problems.push(t('Recorded review evidence needs checking.','已记录的审核依据需要核对。'));
  if(problems.length)lines.push('',t('## Items to resolve','## 当前待处理事项'),'',...problems.map(p=>'- '+p));
  lines.push('',t('## Delivery progress','## 整体进度'),'',t('| Stage / work | Status |','| 阶段／工作 | 状态 |'),'| --- | --- |');
  for(const r of state.stageRuns)lines.push(`| ${v(r.stage)} · ${cell(r.scope)} | ${progress(r)} |`);
  if(!state.deliveryPolicy.partialRef)for(const stage of ['requirements','tech-design','contract','test-design','plan','implement','review','verify','handoff']) {
    if(state.stageRuns.some(r=>r.stage===stage))continue;
    if(stage==='contract' && state.documentPolicy.interface==='none' && state.documentPolicy.databases?.length===0)continue;
    const unknown=stage==='contract' && (state.documentPolicy.interface===null || state.documentPolicy.databases===null);
    lines.push(`| ${v(stage)} | ${unknown?t('Applicability to be determined during design','待技术设计确认是否适用'):t('Not started','尚未开始')} |`);
  }
  lines.push('',`${t('Delivery conclusion','交付结论')}: ${v(completion.status)}`);
  // Full completion diagnostics matter at handoff, not as a list of early-stage defects.
  if(current?.stage==='handoff' || state.outcome.goal==='met')lines.push(...completion.gaps.map(g=>'- '+cell(g)));
  if(state.outcome.acceptance!=='not-recorded')lines.push(`${t('User acceptance','用户验收')}: ${v(state.outcome.acceptance)}`);
  if(state.outcome.mergeRef)lines.push(`${t('Merge record','合并记录')}: ${artifactLink(state.outcome.mergeRef)}`);
  if(state.outcome.deploymentRef)lines.push(`${t('Deployment record','部署记录')}: ${artifactLink(state.outcome.deploymentRef)}`);
  lines.push('',t('## Goal and adopted materials','## 目标与采用材料'),'',`${t('Endpoint','交付终点')}: ${cell(state.goal.endpoint??t('To be confirmed','待确认'))}`);
  if(state.documentPolicy.interface===null || state.documentPolicy.databases===null)lines.push('',t('Interface/database applicability will be determined during technical design.','接口／数据库适用性待技术设计确认。'));
  const refs=new Map();
  const names={testing:t('Test cases and results','用例与结果'),sql:'SQL',prd:t('Requirements','需求依据'),source:t('Source material','来源材料'),prototype:t('Prototype','原型')};
  for(const d of state.documents)refs.set(d.path,`${names[d.kind]??v(d.kind)} · ${cell(d.version)}`);
  for(const ref of state.stageRuns.flatMap(r=>[...r.outputRefs,r.resultRef].filter(Boolean)).concat(state.next.inputRefs??[]))if(!refs.has(ref.split('#')[0]))refs.set(ref.split('#')[0],t('Work material','工作材料'));
  for(const [ref,role] of refs)if(await available(directory,state,ref))lines.push(`- ${role}: ${artifactLink(ref)}`);
  lines.push('',t('## Continue this delivery','## 接续本次交付'),'',`${t('Delivery directory','交付目录')}: ${cell(path.resolve(directory))}`,'',t('Explicitly activate Aimship in a new session, name this directory and read the saved state and current materials. Resume this stop; “continue” is not approval. A new session is recommended at stage boundaries, but you may continue here.','新会话明确启用 Aimship，指定此目录，读取已保存状态和当前材料，接续本页停点；“继续”不代表批准。阶段边界建议新会话，也可在当前会话继续。'));
  if(state.repositories.length) {
    lines.push('',t('## Associated engineering','## 关联工程'),'',t('| Object | Location | Role |','| 工程 | 位置 | 用途 |'),'| --- | --- | --- |');
    for(const r of state.repositories)lines.push(`| ${cell(r.id)} | ${cell(r.path)} | ${cell(r.role)} |`);
  }
  lines.push('',t('## Saved information','## 保存信息'),'',`${t('Delivery','交付')}: ${state.deliveryId}`,`${t('State revision','状态修订')}: ${state.revision}`,`${t('Rules','规则版本')}: ${state.rulesVersion}`,`${t('State saved','状态保存时间')}: ${state.updatedAt}`,'',t('Generated from saved state and document checks. Update the formal records, not this page. Recorded results are not independent proof of execution.','由保存状态和文档检查生成；请更新正式记录，不手改本页。记录结果不等于独立验证了实际执行。'),'');
  return lines.join('\n');
}
export async function generateView(directory,state,preserveEdits=false) {
  const p=paths(directory); const diagnostic=await viewStatus(directory,state);
  let preservedPath;
  try {
    if (['modified','error'].includes(diagnostic.status) && await exists(p.view)) {
      if (!preserveEdits) return {...diagnostic,status:'protected'};
      await noSymlinks(p.view);
      preservedPath=path.join(directory,'.aimship',`status-edits-${randomUUID()}.md`);
      await atomicWrite(preservedPath,await fs.readFile(p.view));
    }
    const text=await renderText(directory,state);
    await atomicWrite(p.view,text);
    await atomicWrite(p.meta,json({deliveryId:state.deliveryId,revision:state.revision,hash:hash(text)}));
    return {status:'current',revision:state.revision,...(preservedPath?{preservedPath}:{})};
  } catch(error) {return {status:'error',reason:error.code??error.message,...(preservedPath?{preservedPath}:{}),recovery:text(state,'State was saved. Repair the view paths, then render at the returned revision; do not replay update.','状态已保存。请修复视图路径，并在返回的修订上重新生成视图；不要重复业务更新。')};}
}
export async function savedResult(directory,state) {
  const view=await generateView(directory,state);
  return {...state,writeResult:{stateSaved:true,revision:state.revision,view,receipt:{status:view.status==='current'?'saved':'view-repair-required',deliveryId:state.deliveryId,directory:path.resolve(directory),statePath:path.join(path.resolve(directory),'.aimship/state.json'),statusPath:view.status==='current'?path.join(path.resolve(directory),'status.md'):null,rulesVersion:state.rulesVersion,currentStage:state.stageRuns.find(r=>r.id===state.currentRun)?.stage??(state.goalRef==='source/request.md'?'requirements preparation':null),nextAction:state.next.action,repositoryCount:state.repositories.length},session:sessionAdvice(directory,state,await reviewStatus(directory,state),{saved:view.status==='current'})}};
}
