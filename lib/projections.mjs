// Finite generated summaries are views of delivery facts, never another ledger.
import {text, displayValue} from './language.mjs';

const titles={
  plan:['5.1 Current batch progress (generated)','5.1 当前批次进度（由状态生成）'],
  testing:['5.1 Current verification (generated)','5.1 当前验证结果（由状态生成）'],
  review:['1.1 Current review (generated)','1.1 当前审查结论（由状态生成）']
};
const containers={
 plan:['Current execution and history','当前执行与历史'],
 testing:['Formal verification and execution records','正式验证结果及执行记录'],
 review:['Current conclusion and applicable object','当前结论与适用对象']
};
const headingKey=value=>value.replace(/^\d+(?:\.\d+)*[.)、]?\s*/, '').trim().toLowerCase();
export const generatedKinds=Object.keys(titles);
// Ignore fenced examples and comments when locating an owned heading. Preserve
// byte offsets so stripping or replacing the body leaves AI prose untouched.
function headings(raw){
 let fence=null,offset=0;const result=[];
 const visible=raw.replace(/<!--[^]*?-->/g,m=>m.replace(/[^\n]/g,' '));
 for(const line of visible.split('\n')){
  const mark=/^ {0,3}(`{3,}|~{3,})/.exec(line);
  if(mark){if(!fence)fence=mark[1];else if(mark[1][0]===fence[0]&&mark[1].length>=fence.length)fence=null;}
  else if(!fence){const h=/^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*$/.exec(line);if(h)result.push({level:h[1].length,title:h[2],start:offset,end:offset+line.length});}
  offset+=line.length+1;
 }
 return result;
}
export function generatedArea(raw,kind){
 const all=headings(raw),matches=all.filter(h=>h.level===3&&titles[kind]?.includes(h.title));
 if(matches.length!==1)return {count:matches.length};
 const h=matches[0],parents=all.filter(n=>n.level===2&&containers[kind]?.some(title=>headingKey(title)===headingKey(n.title))),parent=all.filter(n=>n.start<h.start&&n.level<=2).at(-1);
 if(parents.length!==1||parent!==parents[0])return {count:0,reason:'GENERATED_SECTION_MISPLACED'};
 const end=all.find(n=>n.start>h.start&&n.level<=3)?.start??raw.length;
 return {count:1,start:h.start,bodyStart:h.end,end,body:raw.slice(h.end,end),title:h.title};
}
export function strippedGenerated(raw,kind){
 const area=generatedArea(raw,kind);return area.count===1?raw.slice(0,area.bodyStart)+'\n\n'+raw.slice(area.end):raw;
}
export function initialGeneratedBody(body){return ['', 'Pending state generation.','等待状态生成。'].includes(body.trim());}
const cell=x=>String(x??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const reference=ref=>ref?`[${cell(ref).replaceAll('[','\\[').replaceAll(']','\\]')}](${ref.split('#')[0].replaceAll(' ','%20').replaceAll('(','%28').replaceAll(')','%29')})`:'—';
const list=refs=>refs?.length?refs.map(reference).join('; '):'—';
export function projectionText(state,review,kind){
 const t=(en,zh)=>text(state,en,zh),value=x=>cell(displayValue(state,x));
 const model=review.execution,run=id=>state.stageRuns.find(r=>r.id===id),status=id=>review.runs.find(r=>r.id===id);
 const lines=[t(`Saved state revision: ${state.revision}.`,`保存状态修订：${state.revision}。`),''];
 if(kind==='plan'){
  lines.push(t('| Batch / TASK scope | Implementation | Batch review / repair | Result references | Remaining work or blocker |','| 批次／TASK范围 | 实施 | 批审／修复 | 结果引用 | 剩余工作或阻塞 |'),'| --- | --- | --- | --- | --- |');
  for(const b of model.batches){
   const work=b.implementationIds.map(run),reviews=b.reviewIds.map(run),last=reviews.filter(r=>!status(r.id)?.resolvedBy).at(-1),repairs=work.filter(r=>r.workType==='repair');
   const implementation=!work.length?t('Not started','尚未开始'):work.every(r=>status(r.id)?.releaseReady)?t('Recorded implementation complete','实现已记录完成'):t('In progress or needs checking','进行中或待核对');
   const detail=(last?`${value(last.result??'unknown')} · ${reference(last.resultRef)}`:t('Batch review pending','待批次审查'))+(repairs.length?t(`; repairs: ${repairs.length}`,`；修复工作：${repairs.length}`):'');
   const blocked=work.flatMap(r=>status(r.id)?.blockedBy??[]);
   lines.push(`| ${reference(b.definitionRef)} · ${list(b.taskRefs)} | ${implementation} | ${detail} | ${list(work.map(r=>r.resultRef).filter(Boolean))} | ${value(b.status)}${blocked.length?' · '+blocked.map(cell).join(', '):''} |`);
  }
  if(!model.batches.length)lines.push(t('| No approved batches registered | Not started | Not started | — | Register the approved plan batches when applicable. |','| 尚未登记已批准批次 | 尚未开始 | 尚未开始 | — | 适用时登记已批准计划中的批次。 |'));
 }else if(kind==='testing'){
  lines.push(t(`Current reviewed object: ${model.verification.objectKey??'not recorded'}.`,`当前已审对象：${model.verification.objectKey??'尚未记录'}。`),'',t('| Coverage | Current result | Effective RUN / evidence |','| 覆盖范围 | 当前结果 | 有效RUN／依据 |'),'| --- | --- | --- |');
  for(const c of model.verification.coverage)lines.push(`| ${reference(c.ref)} | ${value(c.result)} | ${reference(c.resultRef)} |`);
  if(!model.verification.coverage.length)lines.push(t('| No current coverage registered | Not run | — |','| 尚未登记当前覆盖 | 未执行 | — |'));
  lines.push('',model.verification.passed?t('Current recorded coverage passed. Historical RUNs remain below.','当前已记录覆盖通过；历史RUN保留在下方。'):t('Verification is incomplete; unresolved or unexecuted coverage remains visible above.','验证尚未完成；未解决或未执行的覆盖保留在上表。'));
 }else if(kind==='review'){
  lines.push(t('| Scope | Current review | Result / applicability | Recheck or remaining scope |','| 范围 | 当前审查 | 结果／适用性 | 复查或剩余范围 |'),'| --- | --- | --- | --- |');
  const groups=[...model.batches.map(b=>({key:b.id,batch:b,records:state.stageRuns.filter(r=>r.stage==='review'&&r.reviewScope==='batch'&&r.batchId===b.id&&r.progress!=='planned')})),{key:state.deliveryPolicy.partialRef&&!model.batches.length?t('Review','审查'):t('Overall review','整体审查'),records:state.stageRuns.filter(r=>r.stage==='review'&&r.reviewScope==='overall'&&r.progress!=='planned')}];
  for(const group of groups){const r=group.records.filter(r=>!status(r.id)?.resolvedBy).at(-1);if(!r){lines.push(`| ${cell(group.key)} | — | ${t('Not started','尚未开始')} | — |`);continue;}
   const effective=r.reviewScope==='overall'?(state.deliveryPolicy.partialRef&&!model.batches.length?status(r.id)?.releaseReady&&r.result==='passed':model.overall?.id===r.id):group.batch?.status==='complete'&&group.batch.reviewId===r.id;
   lines.push(`| ${cell(group.key)} | ${reference(r.resultRef)} | ${value(r.result??'unknown')} · ${value(r.applicability??'current')} | ${effective?t('Current passing review','当前有效通过审查'):t('Inspect the cited review and affected scope.','核对所引审查及受影响范围。')} |`);
  }
  lines.push('',t('Findings, severity, disposition and review-object details stay in the REV records below. Review is separate from formal testing and user acceptance.','问题严重度、处置及审查对象详情留在下方REV记录中；审查与正式测试、用户验收分别记录。'));
 }
 return '\n\n'+lines.join('\n')+'\n\n';
}
