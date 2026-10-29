import fs from 'node:fs/promises';
import path from 'node:path';
import { hash, inside, fail } from './io.mjs';

export async function artifactMap() {
  return JSON.parse(await fs.readFile(new URL('../skills/aimship/references/artifact-map.json', import.meta.url), 'utf8'));
}
export function resolveRef(directory, state, ref) {
  if (/^https?:\/\//.test(ref)) return null;
  let base = path.resolve(directory), relative = ref.split('#')[0];
  if (relative.startsWith('repo:')) {
    const [, id, rest] = /^repo:([^/]+)\/(.*)$/.exec(relative) ?? [];
    base = state.repositories.find(r => r.id === id)?.path;
    if (!base) return null;
    relative = rest;
  }
  const file = path.resolve(base, relative);
  if (!inside(base, file)) fail('INVALID_REFERENCE', 'Reference escapes its root.', 'Repair the registered reference.');
  return file;
}
export async function safeRead(directory, state, ref, encoding = 'utf8') {
  const file = resolveRef(directory, state, ref);
  if (!file) return null;
  const real = await fs.realpath(file);
  const base = ref.startsWith('repo:') ? state.repositories.find(r => r.id === /^repo:([^/]+)/.exec(ref)[1]).path : directory;
  if (!inside(await fs.realpath(base), real)) fail('INVALID_REFERENCE', 'Reference resolves outside its root.', 'Repair the symbolic link or reference.');
  return fs.readFile(real, encoding);
}
// Read ordinary Markdown, ignoring examples and comments. Offsets are retained
// so the same parser defines document checks and approval boundaries.
export function markdownText(text) {
  let fence = null;
  return text.replace(/<!--[^]*?-->/g, m => m.replace(/[^\n]/g, ' ')).split('\n').map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return ' '.repeat(line.length);
    }
    return fence || /^(?: {4}|\t| *>)/.test(line) ? ' '.repeat(line.length) : line;
  }).join('\n');
}
const normalizeHeading = value => value.replace(/^\d+(?:\.\d+)*[.)、]?\s*/, '').trim().toLowerCase();
export function headings(text) {
  return [...markdownText(text).matchAll(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*$/gm)].map(m => ({title:m[2], key:normalizeHeading(m[2]), level:m[1].length, start:m.index, end:m.index+m[0].length}));
}
export function sections(text, spec) {
  const all=headings(text);
  return spec.sections.map((id,i) => {
    const names=Object.values(spec.headings).map(titles=>normalizeHeading(titles[i]));
    const matches=all.filter(h=>h.level===2 && names.includes(h.key));
    const h=matches.length===1?matches[0]:null;
    const end=h ? (all.find(next=>next.start>h.start && next.level<=2)?.start ?? text.length) : null;
    return {id, count:matches.length, start:h?.start, end, body:h?markdownText(text.slice(h.end,end)).trim():null};
  });
}
const ID = '(?:REQ|FR|BR|PERM|EC|AC|B|TASK|TC|REV|RUN|CHG|Q|PAGE)-[0-9]{3,}';
export const numberedIds = text => [...new Set(markdownText(text).match(new RegExp('\\b'+ID+'\\b','g'))??[])];
// A file-qualified Markdown citation names its own readable source. It does not
// create a second local definition or a namespace/index.
function qualifiedCitations(text) {
  const references=[];
  // A displayed link-syntax example is not a link. Keep ordinary `REQ-001`
  // references visible to the number check.
  const prose=markdownText(text).replace(/(`+)([^\n]*?)\1/g,(span,ticks,body)=>/\[[^\]]*\]\(/.test(body)?' '.repeat(span.length):span);
  const local=prose.replace(/\[([^\]\n]*)\]\(([^()\s]+\.md)(?:#([^()\s]+))?\)/gi,(match,label,file,fragment)=>{
    const locator=fragment??label.trim(),target=`${file}#${locator}`;
    if (!new RegExp('^'+ID+'$').test(locator)) return match;
    references.push({target,locator});
    return label.replaceAll(locator,'');
  });
  return {references,local};
}
const definitionSections={REQ:['requirements'],FR:['requirements'],BR:['requirements'],PERM:['requirements'],EC:['requirements'],AC:['acceptance'],B:['batches'],TASK:['tasks'],TC:['cases']};
const referenceHeading=title=>/\b(?:coverage|summary|references|conclusion|notes)\b|覆盖|总结|汇总|引用|结论|备注/i.test(title);
export function definitions(text, file, spec) {
  const lines=markdownText(text).split('\n'), result=[], context=[];
  const areas=spec?sections(text,spec):[];
  let offset=0;
  for(let i=0;i<lines.length;i++) {
    const line=lines[i], start=offset; offset+=line.length+1;
    const heading=/^ {0,3}(#{1,6})[ \t]+(.+)$/.exec(line);
    if(heading) {
      while(context.length && context.at(-1).level>=heading[1].length)context.pop();
      context.push({level:heading[1].length,title:heading[2]});
    }
    const structured=/^\s*(?:\||#{1,6}\s+|[-*+]\s+)/.test(line);
    if(!structured && !new RegExp('^'+ID+'[:：]').test(line)) continue;
    const candidate=line.trim().replace(/^\|\s*/, '').replace(/^(?:#{1,6}\s+|[-*+]\s+)/,'').replace(/^[*`]+/,'');
    const match=new RegExp('^('+ID+')(?![A-Za-z0-9_-])(?:[*`]*)(?:\\s*[|:：—–-]\\s*|\\s+|$)(.*)$').exec(candidate);
    if(!match) continue;
    let body=match[2];
    // A readable heading/list may put its explanation on following lines.
    if(!/^\s*\|/.test(line)) {
      for(let j=i+1;j<lines.length;j++) {
        if(/^\s*(?:#{1,6}\s+|\||[-*+]\s+)/.test(lines[j]) || new RegExp('^'+ID+'[:：]').test(lines[j])) break;
        body+='\n'+lines[j];
      }
    }
    const primary=areas.some(area=>definitionSections[match[1].split('-')[0]]?.includes(area.id) && start>=area.start && start<area.end);
    result.push({id:match[1],file,body,refs:numberedIds(body).filter(id=>id!==match[1]),primary,reference:context.some(h=>referenceHeading(h.title))});
  }
  // Definitions remain unique in their existing owning sections. Repeating an
  // established number in a summary, coverage table or execution log cites it.
  // Unstructured sources use their ordinary summary/coverage headings; two
  // substantive definitions elsewhere are still a conflict, never first-wins.
  return result.filter(d=>!result.some(other=>other.id===d.id && other!==d &&
    ((!d.primary && other.primary) || (d.primary===other.primary && d.reference && !other.reference))))
    .map(({primary,reference,...record})=>record);
}
export function meaningful(text) {
  const body=markdownText(text).replace(new RegExp(ID,'g'),'').replace(/[\s|:*`_#.—–-]/g,'');
  return body.length>=3 && !/^(?:TBD|TODO|N\/A|待补充|待填写|未填写|\.{3})$/i.test(body)
    && !/Replace guidance with actual content|<deliveryId from init>|<revision>/.test(text);
}
// A fragment is a search locator, not a renderer-dependent hyperlink anchor.
export function hasLocator(text, locator, spec) {
  if(spec && spec.sections.includes(locator)) return sections(text,spec).find(s=>s.id===locator)?.count===1;
  if(new RegExp('^'+ID+'$').test(locator)) return definitions(text,'',spec).filter(d=>d.id===locator).length===1;
  return headings(text).filter(h=>h.title===locator || h.key===normalizeHeading(locator)).length===1;
}
export function unknownConditions(policy) {
  return ['interaction','interface','databases'].filter(key=>policy[key] === null);
}
export async function inspectDocuments(directory, state) {
  const map = await artifactMap(), issues = [], unchecked = [], digests = {}, defs = [], documentSections = new Map();
  const docs = state.documents ?? [];
  const policy = state.documentPolicy;
  for (const kind of new Set(docs.map(d=>d.kind))) if (!['sql','source'].includes(kind) && docs.filter(d=>d.kind===kind).length>1) issues.push(`Register one current artifact for ${kind}; keep history through references.`);
  const requirementKind = 'prd';
  const find = kind => docs.find(d => d.kind === (kind === 'requirement' ? requirementKind : kind));
  if (state.schemaVersion === 4) {
    try {
      const request = await safeRead(directory,state,'source/request.md');
      if (!request?.trim()) issues.push('Missing or empty source/request.md.');
      else digests['source/request.md'] = hash(request);
    } catch { issues.push('Cannot read source/request.md inside this delivery.'); }
  }
  const preparing = state.schemaVersion === 4 && !find('requirement');
  if (preparing && state.goalRef !== 'source/request.md') issues.push('Before requirements exist, goalRef must point to source/request.md.');
  if (!preparing && !find('requirement')) issues.push(`Register ${requirementKind} as the requirement entry.`);
  if (!preparing && policy.authority === null) issues.push('Select the requirement authority when registering PRD.');
  if (find('requirement') && state.goalRef.split('#')[0]!==find('requirement').path) issues.push('goalRef must point to the registered requirement authority.');
  for (const doc of docs) {
    const spec = map.documents[doc.kind];
    // Location rules apply even when content is remote or cannot be read.
    if (doc.mode==='new') {
      if (spec && doc.path!==spec.path) issues.push(`${doc.kind} must use ${spec.path}, not ${doc.path}.`);
      if (doc.kind==='prototype' && (!doc.path.startsWith('prototype/') || (/\.html$/.test(doc.path) && doc.path!=='prototype/index.html'))) issues.push('New prototypes must stay in prototype/; HTML uses prototype/index.html.');
      if (doc.kind==='source' && !doc.path.startsWith('source/')) issues.push('New source material must stay in source/.');
    }
    let text;
    try { text = await safeRead(directory, state, doc.path); }
    catch (error) { issues.push(`Cannot read ${doc.path}: ${error.code}`); continue; }
    if (text === null) { unchecked.push(`${doc.path}: remote or unavailable repository; inspect adopted version using host tools (${doc.basisRef ?? 'missing basisRef'}).`); continue; }
    digests[doc.path] = hash(text);
    if (!text.trim()) issues.push(`${doc.path}: empty document.`);
    if (doc.mode === 'reused') {
      // Reuse is a current input option, not a historical document protocol.
      // Read ordinary IDs from the explicitly registered requirement authority;
      // do not impose our outline or infer that arbitrary source formats passed.
      if (doc === find('requirement') && /\.md$/i.test(doc.path)) defs.push(...definitions(text,doc.path));
      unchecked.push(`${doc.path}: reused format/content; human/Agent basis ${doc.basisRef}.`); continue;
    }
    if (spec) {
      const records=sections(text,spec); let previous=-1;
      documentSections.set(doc.path,records);
      for(const record of records) {
        if(record.count!==1 || record.start<=previous) issues.push(`${doc.path}: missing, duplicate or unordered section ${record.id}.`);
        previous=record.start;
        if(record.count===1 && !record.body) issues.push(`${doc.path}: empty section ${record.id}.`);
      }
      const owned={prd:['REQ','FR','BR','PERM','EC','AC','PAGE'],plan:['B','TASK'],testing:['TC','RUN'],review:['REV'],'change-log':['CHG']}[doc.kind]??[];
      defs.push(...definitions(text, doc.path, spec).filter(d=>owned.includes(d.id.split('-')[0]) || d.id.startsWith('Q-')));
    }
  }
  const runs = state.stageRuns;
  for (const [i, run] of state.stageRuns.entries()) {
    if (run.progress === 'planned') continue;
    const contract = map.stages[run.stage], doc = find(contract.kind) ?? (run.stage === 'contract' && policy.interface === 'none' ? find('sql') : null);
    if (!doc && preparing && ['frame','requirements'].includes(run.stage) && run.progress !== 'done') continue;
    if (!doc) { issues.push(`${run.id}: missing registered ${contract.kind} artifact.`); continue; }
    if (run.stage === 'implement' && !state.stageRuns.slice(0,i).some(r => r.stage === 'plan' && r.progress === 'done')) issues.push(`${run.id}: complete plan before implementation.`);
    if (run.progress === 'done') {
      if (run.resultRef?.split('#')[0] !== doc.path) issues.push(`${run.id}: result must locate its mapped artifact ${doc.path}.`);
      const section = contract.sectionByKind?.[doc.kind] ?? contract.section;
      if (doc.mode==='new' && section && !['review','verify'].includes(run.stage) && run.resultRef !== `${doc.path}#${section}`) issues.push(`${run.id}: use the mapped #${section} result section.`);
      if(map.documents[doc.kind] && doc.mode==='new') {
        const body=await safeRead(directory,state,doc.path).catch(()=>'');
        if(!run.resultRef?.includes('#') || !hasLocator(body,run.resultRef.split('#')[1],map.documents[doc.kind])) issues.push(`${run.id}: missing or ambiguous result locator ${run.resultRef}.`);
        const used=documentSections.get(doc.path)?.find(s=>s.id===section);
        if(used && !meaningful(used.body??'')) issues.push(`${run.id}: replace template guidance with substantive ${section} content.`);
      }
      if (!run.outputRefs.some(r => r.split('#')[0] === doc.path)) issues.push(`${run.id}: outputRefs must register ${doc.path}.`);
      if (['review','verify'].includes(run.stage) && doc.mode==='new') {
        const prefix=run.stage==='review'?'REV-':'RUN-';
        const record=defs.find(d=>d.file===doc.path && d.id.startsWith(prefix) && `${doc.path}#${d.id}`===run.resultRef);
        if(!record || !meaningful(record.body)) issues.push(`${run.id}: result must locate a substantive ${prefix} record.`);
        if(state.stageRuns.some(other=>other.id!==run.id && other.progress==='done' && other.resultRef===run.resultRef)) issues.push(`${run.id}: use a distinct result record for each execution.`);
      }
      if (run.stage === 'contract') {
        for (const db of policy.databases ?? []) {
          const file = policy.databases.length === 1 ? 'database.sql' : `database-${db}.sql`;
          if (!docs.some(d => d.kind === 'sql' && d.path === file) || !(await safeRead(directory,state,file).catch(()=>null))) issues.push(`${run.id}: missing independent ${file}.`);
        }
      }
    }
  }
  if (state.schemaVersion === 4) {
    const unknown = unknownConditions(policy);
    const dependent = runs.filter(r=>r.progress !== 'planned' && !['frame','requirements','diagnose'].includes(r.stage));
    if (preparing && dependent.length) issues.push('Prepare and review formal requirements before dependent work.');
    if (state.goal.endpoint === null && dependent.length) issues.push('Resolve the delivery endpoint before dependent work; initialization grants no further authorization.');
    if (unknown.length && runs.some(r=>(r.stage === 'tech-design' && r.progress === 'done') || (['contract','test-design','plan','implement'].includes(r.stage) && r.progress !== 'planned'))) issues.push(`Resolve artifact conditions before completing design or dependent work: ${unknown.join(', ')}.`);
  }
  if (state.reviewPolicy === 1 && (policy.interface !== 'none' || (policy.databases?.length ?? 0)) && runs.some(r=>['test-design','plan','implement'].includes(r.stage) && r.progress !== 'planned') && !runs.some(r=>r.stage==='contract' && r.progress==='done')) issues.push('Complete the applicable interface/SQL contract before test design, plan or implementation.');
  if (policy.interface === 'http') {
    const doc=find('contract');
    if (doc?.mode === 'new' && doc.path !== 'openapi.yaml') issues.push('New HTTP contract must be openapi.yaml.');
  }
  if (runs.some(r=>r.stage==='implement' && r.progress!=='planned') && runs.some(r=>r.stage==='prototype' && r.progress!=='done')) issues.push('Complete the selected prototype before implementation.');
  const seen=new Set();
  for(const d of defs) {
    if(seen.has(d.id)) issues.push(`Duplicate definition ${d.id}.`);
    seen.add(d.id);
    if(!meaningful(d.body)) issues.push(`${d.id}: empty or placeholder definition.`);
  }
  for(const doc of docs.filter(d=>d.mode==='new' && map.documents[d.kind])) {
    const body=await safeRead(directory,state,doc.path).catch(()=>null);
    if(!body) continue;
    const citations=qualifiedCitations(body);
    for(const {target,locator} of citations.references) {
      try {
        const source=await safeRead(directory,state,decodeURI(target));
        const sourcePath=decodeURI(target).split('#')[0], registered=docs.find(d=>d.path===sourcePath && d.mode==='new');
        const records=source===null?[]:definitions(source,sourcePath,map.documents[registered?.kind]).filter(d=>d.id===locator);
        if(records.length!==1 || !meaningful(records[0].body)) issues.push(`${doc.path}: missing, ambiguous or empty source locator ${target}.`);
      } catch { issues.push(`${doc.path}: unreadable source citation ${target}.`); }
    }
    for(const id of numberedIds(citations.local)) if(!seen.has(id)) issues.push(`${doc.path}: undefined reference ${id}.`);
  }
  for(const doc of docs.filter(d=>d.mode==='new' && map.documents[d.kind])) {
    const ready=runs.some(r=>r.progress==='done' && (find(map.stages[r.stage].kind)?.path===doc.path))
      || (state.reviewHistory??[]).some(r=>r.document===doc.path && r.version===doc.version && (r.kind==='approved' || (r.kind==='self-check' && r.result==='passed')));
    const records=documentSections.get(doc.path)??[];
    if(ready) {
      if(doc.kind==='prd' && !defs.some(d=>d.file===doc.path && /^(REQ|FR|BR|PERM|EC)-/.test(d.id))) issues.push(`${doc.path}: include substantive requirement records (REQ or adopted business IDs).`);
      for(const section of records) if(!meaningful(section.body??'')) issues.push(`${doc.path}: replace template guidance with substantive ${section.id} content.`);
      for(const prefix of ({prd:['AC'],testing:['TC'],plan:['TASK']}[doc.kind]??[])) {
        if(!defs.some(d=>d.file===doc.path && d.id.startsWith(prefix+'-'))) issues.push(`${doc.path}: include substantive ${prefix} records.`);
      }
    }
    // Design obligations cannot hide in an unapproved execution surface.
    const design=({plan:[['TASK','tasks'],['B','batches']],testing:[['TC','cases']]})[doc.kind]??[];
    for(const [prefix,section] of design) {
      const allowed=definitions(records.find(r=>r.id===section)?.body??'',doc.path).map(d=>d.id);
      for(const d of defs.filter(d=>d.file===doc.path && d.id.startsWith(prefix+'-'))) if(!allowed.includes(d.id)) issues.push(`${doc.path}: define ${d.id} in ${section}, not execution records.`);
    }
  }
  return {issues,unchecked,digests};
}
export async function documentChanges(directory, state) {
  const changes=[];
  for (const [ref, digest] of Object.entries(state.documentDigests ?? {})) {
    try { const text = await safeRead(directory,state,ref); if (text === null || hash(text) !== digest) changes.push(ref); }
    catch { changes.push(ref); }
  }
  return changes;
}
