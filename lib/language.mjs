// Delivery display language only. Stable identifiers and existing user content stay unchanged.
export const languageOf = state => state.language;
export const text = (state, english, chinese) => languageOf(state) === 'zh-CN' ? chinese : english;
const labels = {
 'not recorded':'未记录', unknown:'未知', null:'未知', true:'是', false:'否', none:'不适用', http:'HTTP', other:'其他',
 technical:'技术与契约', unrecorded:'未分组', unavailable:'不可用', 'assess-outcome':'核对交付结论与接受结果', frame:'目标梳理', requirements:'需求', prototype:'原型', 'tech-design':'技术设计', contract:'接口与 SQL', 'test-design':'测试设计', plan:'实施计划', implement:'实施', review:'审查', verify:'验证', handoff:'交付验收', diagnose:'调查',
 planned:'待开始', active:'进行中', blocked:'受阻', done:'已完成记录', passed:'通过', failed:'失败', 'not-run':'未执行', mixed:'部分通过', current:'当前有效', 'needs-review':'待复核',
 'in-progress':'进行中', met:'已达成', 'not-met':'未达成', 'not-recorded':'未记录', accepted:'已接受', declined:'未接受',
 approved:'已批准', pending:'待审核', 'self-check-required':'待自检', 'self-check-failed':'自检失败', 'changes-requested':'需修改', 'evidence-changed':'审批依据已变化',
 'partial-scope':'明确限定范围', 'standard-complete':'标准交付已完成', 'ready-for-acceptance':'待验收', incomplete:'未完成',
 'continue-current':'继续当前工作', 'await-continue':'等待继续', 'inspect-existing-work':'检查已有工作', 'resolve-current':'先处理当前问题', 'await-review':'等待审核', 'reconcile-save':'核对保存结果', finished:'当前约定目标已结束', 'arrange-next':'确认并记录下一项工作',
 'requirements preparation':'需求准备', supported:'已启用', enforced:'已启用',
 interaction:'交互变化', prototypeCovered:'已有原型覆盖', interface:'接口变化', databases:'数据库变化'
};
export function displayValue(state,value) {
 const raw=String(value ?? 'not recorded');
 return languageOf(state)==='zh-CN' ? (labels[raw] ?? raw) : raw;
}
const explanations = {
 'Delivery endpoint remains unknown.':'交付终点尚待确认。',
 'Artifact conditions remain unknown.':'产物适用条件待技术设计确认。',
 'Changed or missing registered documents require reconciliation.':'已登记文档有变化或缺失，需要核对。',
 'Missing reviewed requirements.':'需求文档尚未完成审核。',
 'Missing applicable interface/SQL contract.':'缺少本次适用的接口或 SQL 契约。',
 'Missing applicable interaction prototype.':'缺少本次适用的交互原型。',
 'Selected work or document approvals remain unresolved.':'已安排工作或文档审批仍有未完成项。',
 'Implementation results remain unresolved.':'实施结果仍有未解决项。',
 'Review results remain unresolved.':'审查结果仍有未解决项。',
 'Missing passing overall implementation review.':'缺少通过的整体实施审查。',
 'Independent verification is not fully recorded as passed after overall review.':'整体审查之后的独立验证尚未完整记录为通过。',
 'Handoff precedes verification.':'交付记录早于验证。',
 'Unresolved changes remain.':'仍有未处理的变更。'
};
export function completionMessage(state,message) {
 if(languageOf(state)!=='zh-CN')return message;
 if(explanations[message])return explanations[message];
 const stage=/^Missing current completed (.+)\.$/.exec(message);
 if(stage)return `缺少当前有效且已完成的${displayValue(state,stage[1])}记录。`;
 const batch=/^Missing passing batch review for (.+)\.$/.exec(message);
 if(batch)return `批次 ${batch[1]} 缺少通过的批内审查。`;
 return message;
}
