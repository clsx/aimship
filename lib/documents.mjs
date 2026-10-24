import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { exists, hash, inside, fail, readJSON, json } from './io.mjs';

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
export const anchors = text => [...text.matchAll(/<a\s+id=["']([^"']+)["']\s*><\/a>/g)].map(m => m[1]);
const identityKinds = ['REQ','AC','B','TASK','TC','REV','RUN','CHG','Q','PAGE'];
const identityKind = d => d.kind ?? d.id.split('-')[0];
// Migration exempts preserved execution facts, never future work under an old ID.
export async function preservedLegacyRuns(directory,state) {
  if (!state.legacyRunIds?.length) return new Set();
  const journal=await readJSON(path.join(directory,'.aimship/migration.json'));
  if (journal.protocol!==1 || hash(json(journal.target))!==journal.targetHash || journal.target.deliveryId!==state.deliveryId) fail('MIGRATION_CONFLICT','Cannot verify legacy run provenance.','Inspect the migration journal and original state.');
  const basis=run=>{const {applicability,...facts}=run;return facts;};
  return new Set(state.stageRuns.filter(run=>state.legacyRunIds.includes(run.id) && journal.target.stageRuns.some(old=>old.id===run.id && old.progress==='done' && isDeepStrictEqual(basis(old),basis(run)))).map(run=>run.id));
}
export function definitions(text, file) {
  const markers=[...text.matchAll(/<!--\s*aimship:def\b/g)].length;
  const validMarkers=[...text.matchAll(/<!--\s*aimship:def\s+(\{[^\n]*\})\s*-->/g)].length;
  if (markers !== validMarkers) fail('DOCUMENT_METADATA', `Malformed definition marker in ${file}.`, 'Use a complete single-line aimship:def JSON comment.');
  return [...text.matchAll(/<!--\s*aimship:def\s+(\{[^\n]*\})\s*-->/g)].map(m => {
    try {
      const d = JSON.parse(m[1]);
      const namespace = d.namespace ?? 'local';
      const validId=typeof d.id==='string' && (namespace==='local' ? /^[A-Za-z][A-Za-z0-9_-]*-\d+$/.test(d.id) : d.id.trim().length>0 && !/[:@\r\n]/.test(d.id));
      if (!validId || !Number.isSafeInteger(d.version) || d.version < 1 || !['current','historical','retired'].includes(d.status) || !Array.isArray(d.refs) || !d.refs.every(x => typeof x === 'string' && /^[\w-]+:[^:@\r\n]+@[1-9]\d*$/.test(x)) || !/^[\w-]+$/.test(namespace) || (d.kind!==undefined && (!identityKinds.includes(d.kind) || (namespace==='local' && d.kind!==d.id.split('-')[0])))) throw new Error('Invalid identity metadata');
      return { ...d, namespace, key: `${namespace}:${d.id}@${d.version}`, file };
    } catch { fail('DOCUMENT_METADATA', `Invalid definition in ${file}.`, 'Use the documented aimship:def JSON syntax.'); }
  });
}
export async function inspectDocuments(directory, state) {
  if (state.schemaVersion !== 2 || !state.documentPolicy || state.documentPolicy.authority === 'legacy') return { issues: [], unchecked: ['Legacy documents require recorded compatibility review.'], digests: {}, identities: [], nextIds: {} };
  const map = await artifactMap(), issues = [], unchecked = [], digests = {}, defs = [], documentAnchors = new Map();
  const docs = state.documents ?? [];
  const policy = state.documentPolicy;
  for (const kind of new Set(docs.map(d=>d.kind))) if (!['sql','source'].includes(kind) && docs.filter(d=>d.kind===kind).length>1) issues.push(`Register one current artifact for ${kind}; keep history through references.`);
  if (docs.some(d=>d.kind==='prd'&&d.mode==='new') && docs.some(d=>d.kind==='scope'&&d.mode==='new')) issues.push('Do not create competing new PRD and Scope entries.');
  const requirementKind = policy.authority === 'adopted' ? 'scope' : 'prd';
  const find = kind => docs.find(d => d.kind === (kind === 'requirement' ? requirementKind : kind));
  if (!await exists(path.join(directory, 'source/request.md'))) issues.push('Missing source/request.md.');
  if (!find('requirement')) issues.push(`Register ${requirementKind} as the requirement entry.`);
  if (policy.authority !== 'editable' && state.goalRef.split('#')[0] !== `${requirementKind}.md`) issues.push('goalRef must point to the selected root PRD/Scope.');
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
    if (doc.mode === 'reused') { unchecked.push(`${doc.path}: reused format/content; human/Agent basis ${doc.basisRef}.`); continue; }
    if (spec) {
      const ids = anchors(text); let previous = -1;
      documentAnchors.set(doc.path,ids);
      for (const id of spec.sections) {
        const i = ids.indexOf(id);
        if (i < 0 || i <= previous || ids.filter(x => x === id).length !== 1) issues.push(`${doc.path}: missing, duplicate or unordered section #${id}.`);
        previous = i;
      }
      defs.push(...definitions(text, doc.path));
    }
  }
  const legacyRuns=await preservedLegacyRuns(directory,state);
  const runs = state.stageRuns.filter(r => !legacyRuns.has(r.id));
  for (const [i, run] of state.stageRuns.entries()) {
    if (!runs.includes(run) || run.progress === 'planned') continue;
    const contract = map.stages[run.stage], doc = find(contract.kind) ?? (run.stage === 'contract' && policy.interface === 'none' ? find('sql') : null);
    if (!doc) { issues.push(`${run.id}: missing registered ${contract.kind} artifact.`); continue; }
    if (run.stage === 'implement' && !state.stageRuns.slice(0,i).some(r => r.stage === 'plan' && r.progress === 'done')) issues.push(`${run.id}: complete plan before implementation.`);
    if (run.progress === 'done') {
      if (run.resultRef?.split('#')[0] !== doc.path) issues.push(`${run.id}: result must locate its mapped artifact ${doc.path}.`);
      const section = contract.sectionByKind?.[doc.kind] ?? contract.section;
      if (doc.mode==='new' && section && !['review','verify'].includes(run.stage) && run.resultRef !== `${doc.path}#${section}`) issues.push(`${run.id}: use the mapped #${section} result section.`);
      if (map.documents[doc.kind] && doc.mode === 'new' && !run.resultRef?.includes('#')) issues.push(`${run.id}: result needs a precise section/record anchor.`);
      if (map.documents[doc.kind] && doc.mode==='new' && (documentAnchors.get(doc.path)??[]).filter(id=>id===run.resultRef?.split('#')[1]).length!==1) issues.push(`${run.id}: missing or duplicate result anchor ${run.resultRef}.`);
      if (!run.outputRefs.some(r => r.split('#')[0] === doc.path)) issues.push(`${run.id}: outputRefs must register ${doc.path}.`);
      if (['review','verify'].includes(run.stage) && doc.mode==='new') {
        const prefix=run.stage==='review'?'REV-':'RUN-';
        if (!defs.some(d=>d.file===doc.path && d.namespace==='local' && d.id.startsWith(prefix) && d.run===run.id && `${doc.path}#${d.id.toLowerCase()}-v${d.version}`===run.resultRef)) issues.push(`${run.id}: result must locate its own versioned REV/RUN definition with matching run field.`);
      }
      if (run.stage === 'contract') {
        for (const db of policy.databases) {
          const file = policy.databases.length === 1 ? 'database.sql' : `database-${db}.sql`;
          if (!docs.some(d => d.kind === 'sql' && d.path === file) || !await exists(path.join(directory,file))) issues.push(`${run.id}: missing independent ${file}.`);
        }
      }
    }
  }
  if (state.reviewPolicy === 1 && (policy.interface !== 'none' || policy.databases.length) && runs.some(r=>['test-design','plan','implement'].includes(r.stage) && r.progress !== 'planned') && !runs.some(r=>r.stage==='contract' && r.progress==='done')) issues.push('Complete the applicable interface/SQL contract before test design, plan or implementation.');
  if (policy.interface === 'http') {
    const doc=find('contract');
    if (doc?.mode === 'new' && doc.path !== 'openapi.yaml') issues.push('New HTTP contract must be openapi.yaml.');
  }
  if (policy.interaction && !policy.prototypeCovered && runs.some(r => r.stage === 'implement' && r.progress !== 'planned') && !state.stageRuns.some(r => r.stage === 'prototype' && r.progress === 'done')) issues.push('Uncovered interaction requires completed prototype before implementation.');
  const seen = new Set(), current = new Set(), nextIds = {};
  for (const d of defs) {
    if (seen.has(d.key)) issues.push(`Duplicate definition ${d.key}.`); seen.add(d.key);
    const identity = `${d.namespace}:${d.id}`;
    if (d.status === 'current') { if (state.retiredIdentities?.includes(identity)) issues.push(`Retired identity cannot be reused: ${identity}.`); if (current.has(identity)) issues.push(`Multiple current definitions ${identity}.`); current.add(identity); }
    const numeric=/^(.*)-(\d+)$/.exec(d.id);
    if (numeric) {
      const [,prefix,number]=numeric, group=`${d.namespace}:${prefix}`;
      nextIds[group] = Math.max(nextIds[group] ?? 1, Number(number)+1);
    }
  }
  const byKey=new Map(defs.map(d=>[d.key,d]));
  for (const d of defs) {
    for (const key of d.refs) if (!seen.has(key)) issues.push(`${d.key}: unresolved ${key}.`);
    if (d.status !== 'current') continue;
    const refersTo=kind=>d.refs.some(key=>byKey.has(key) && identityKind(byKey.get(key))===kind);
    if (d.namespace === 'local' && identityKind(d)==='REQ' && !refersTo('AC')) issues.push(`${d.key}: missing acceptance reference.`);
    if (identityKind(d)==='RUN' && !refersTo('TC')) issues.push(`${d.key}: missing versioned case reference.`);
    if (identityKind(d)==='TC' && d.namespace === 'local' && !d.refs.length) issues.push(`${d.key}: missing acceptance or risk basis.`);
    if (identityKind(d)==='AC' && runs.some(r => ['test-design','verify'].includes(r.stage) && r.progress === 'done') && !defs.some(t => t.status === 'current' && identityKind(t)==='TC' && t.refs.includes(d.key))) issues.push(`${d.key}: no current case coverage.`);
  }
  for (const key of state.identityHistory ?? []) if (!seen.has(key)) issues.push(`Preserve historical definition ${key}; retire it rather than deleting/reusing its identity.`);
  return { retired:defs.filter(d=>d.status==='retired').map(d=>`${d.namespace}:${d.id}`), issues, unchecked, digests, identities: [...seen], nextIds };
}
export async function documentChanges(directory, state) {
  const changes=[];
  for (const [ref, digest] of Object.entries(state.documentDigests ?? {})) {
    try { const text = await safeRead(directory,state,ref); if (text === null || hash(text) !== digest) changes.push(ref); }
    catch { changes.push(ref); }
  }
  return changes;
}
