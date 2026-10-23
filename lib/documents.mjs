import fs from 'node:fs/promises';
import path from 'node:path';
import { exists, hash, inside, fail } from './io.mjs';

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
export async function safeRead(directory, state, ref) {
  const file = resolveRef(directory, state, ref);
  if (!file) return null;
  const real = await fs.realpath(file);
  const base = ref.startsWith('repo:') ? state.repositories.find(r => r.id === /^repo:([^/]+)/.exec(ref)[1]).path : directory;
  if (!inside(await fs.realpath(base), real)) fail('INVALID_REFERENCE', 'Reference resolves outside its root.', 'Repair the symbolic link or reference.');
  return fs.readFile(real, 'utf8');
}
export const anchors = text => [...text.matchAll(/<a\s+id=["']([^"']+)["']\s*><\/a>/g)].map(m => m[1]);
export function definitions(text, file) {
  const markers=[...text.matchAll(/<!--\s*aimship:def\b/g)].length;
  const validMarkers=[...text.matchAll(/<!--\s*aimship:def\s+(\{[^\n]*\})\s*-->/g)].length;
  if (markers !== validMarkers) fail('DOCUMENT_METADATA', `Malformed definition marker in ${file}.`, 'Use a complete single-line aimship:def JSON comment.');
  return [...text.matchAll(/<!--\s*aimship:def\s+(\{[^\n]*\})\s*-->/g)].map(m => {
    try {
      const d = JSON.parse(m[1]);
      if (!/^[A-Za-z][A-Za-z0-9_-]*-\d+$/.test(d.id) || !Number.isSafeInteger(d.version) || d.version < 1 || !['current','historical','retired'].includes(d.status) || !Array.isArray(d.refs) || !d.refs.every(x => typeof x === 'string' && /^[\w-]+:[\w-]+@\d+$/.test(x)) || (d.namespace !== undefined && !/^[\w-]+$/.test(d.namespace))) throw new Error('Invalid identity metadata');
      const namespace = d.namespace ?? 'local';
      return { ...d, namespace, key: `${namespace}:${d.id}@${d.version}`, file };
    } catch { fail('DOCUMENT_METADATA', `Invalid definition in ${file}.`, 'Use the documented aimship:def JSON syntax.'); }
  });
}
export async function inspectDocuments(directory, state) {
  if (state.schemaVersion !== 2 || !state.documentPolicy || state.documentPolicy.authority === 'legacy') return { issues: [], unchecked: ['Legacy documents require recorded compatibility review.'], digests: {}, identities: [], nextIds: {} };
  const map = await artifactMap(), issues = [], unchecked = [], digests = {}, defs = [];
  const docs = state.documents ?? [];
  const policy = state.documentPolicy;
  for (const kind of new Set(docs.map(d=>d.kind))) if (!['sql','source'].includes(kind) && docs.filter(d=>d.kind===kind).length>1) issues.push(`Register one current artifact for ${kind}; keep history through references.`);
  if (docs.some(d=>d.kind==='prd'&&d.mode==='new') && docs.some(d=>d.kind==='scope'&&d.mode==='new')) issues.push('Do not create competing new PRD and Scope entries.');
  const requirementKind = policy.authority === 'adopted' ? 'scope' : 'prd';
  const find = kind => docs.find(d => d.kind === (kind === 'requirement' ? requirementKind : kind));
  if (!await exists(path.join(directory, 'source/request.md'))) issues.push('Missing source/request.md.');
  if (!find('requirement')) issues.push(`Register ${requirementKind} as the requirement entry.`);
  if (policy.authority !== 'editable' && state.goalRef.split('#')[0] !== `${requirementKind}.md`) issues.push('goalRef must point to the selected root PRD/Scope.');
  for (const doc of docs) {
    let text;
    try { text = await safeRead(directory, state, doc.path); }
    catch (error) { issues.push(`Cannot read ${doc.path}: ${error.code}`); continue; }
    if (text === null) { unchecked.push(`${doc.path}: remote or unavailable repository; inspect adopted version using host tools (${doc.basisRef ?? 'missing basisRef'}).`); continue; }
    digests[doc.path] = hash(text);
    if (doc.mode === 'reused') { unchecked.push(`${doc.path}: reused format/content; human/Agent basis ${doc.basisRef}.`); continue; }
    const spec = map.documents[doc.kind];
    if (spec) {
      if (doc.path !== spec.path) issues.push(`${doc.kind} must use ${spec.path}, not ${doc.path}.`);
      const ids = anchors(text); let previous = -1;
      for (const id of spec.sections) {
        const i = ids.indexOf(id);
        if (i < 0 || i <= previous || ids.filter(x => x === id).length !== 1) issues.push(`${doc.path}: missing, duplicate or unordered section #${id}.`);
        previous = i;
      }
      defs.push(...definitions(text, doc.path));
    }
  }
  const runs = state.stageRuns.filter(r => !state.legacyRunIds?.includes(r.id));
  for (const [i, run] of state.stageRuns.entries()) {
    if (!runs.includes(run) || run.progress === 'planned') continue;
    const contract = map.stages[run.stage], doc = find(contract.kind);
    if (!doc) { issues.push(`${run.id}: missing registered ${contract.kind} artifact.`); continue; }
    if (run.stage === 'implement' && !state.stageRuns.slice(0,i).some(r => r.stage === 'plan' && r.progress === 'done')) issues.push(`${run.id}: complete plan before implementation.`);
    if (run.progress === 'done') {
      if (run.resultRef?.split('#')[0] !== doc.path) issues.push(`${run.id}: result must locate its mapped artifact ${doc.path}.`);
      const section = contract.sectionByKind?.[doc.kind] ?? contract.section;
      if (doc.mode==='new' && section && !['review','verify'].includes(run.stage) && run.resultRef !== `${doc.path}#${section}`) issues.push(`${run.id}: use the mapped #${section} result section.`);
      if (map.documents[doc.kind] && doc.mode === 'new' && !run.resultRef?.includes('#')) issues.push(`${run.id}: result needs a precise section/record anchor.`);
      if (!run.outputRefs.some(r => r.split('#')[0] === doc.path)) issues.push(`${run.id}: outputRefs must register ${doc.path}.`);
      if (['review','verify'].includes(run.stage) && doc.mode==='new') {
        const prefix=run.stage==='review'?'REV-':'RUN-';
        if (!defs.some(d=>d.id.startsWith(prefix) && d.run===run.id && `${doc.path}#${d.id.toLowerCase()}-v${d.version}`===run.resultRef)) issues.push(`${run.id}: result must locate its own versioned REV/RUN definition with matching run field.`);
      }
      if (run.stage === 'tech-design') {
        for (const db of policy.databases) {
          const file = policy.databases.length === 1 ? 'database.sql' : `database-${db}.sql`;
          if (!docs.some(d => d.kind === 'sql' && d.path === file) || !await exists(path.join(directory,file))) issues.push(`${run.id}: missing independent ${file}.`);
        }
      }
    }
  }
  const prototype=find('prototype');
  if (prototype?.mode==='new' && /\.html$/.test(prototype.path) && prototype.path !== 'prototype/index.html') issues.push('New HTML prototype must use prototype/index.html.');
  if (policy.interface === 'http') {
    const doc=find('contract');
    if (doc?.mode === 'new' && doc.path !== 'openapi.yaml') issues.push('New HTTP contract must be openapi.yaml.');
  }
  if (policy.interaction && !policy.prototypeCovered && state.stageRuns.some(r => r.stage === 'implement' && r.progress !== 'planned') && !state.stageRuns.some(r => r.stage === 'prototype' && r.progress === 'done')) issues.push('Uncovered interaction requires completed prototype before implementation.');
  const seen = new Set(), current = new Set(), nextIds = {};
  for (const d of defs) {
    if (seen.has(d.key)) issues.push(`Duplicate definition ${d.key}.`); seen.add(d.key);
    const identity = `${d.namespace}:${d.id}`;
    if (d.status === 'current') { if (state.retiredIdentities?.includes(identity)) issues.push(`Retired identity cannot be reused: ${identity}.`); if (current.has(identity)) issues.push(`Multiple current definitions ${identity}.`); current.add(identity); }
    const [, prefix, number] = /^(.*)-(\d+)$/.exec(d.id);
    const group = `${d.namespace}:${prefix}`;
    nextIds[group] = Math.max(nextIds[group] ?? 1, Number(number)+1);
  }
  for (const d of defs) {
    for (const key of d.refs) if (!seen.has(key)) issues.push(`${d.key}: unresolved ${key}.`);
    if (d.status !== 'current') continue;
    if (d.namespace === 'local' && d.id.startsWith('REQ-') && !d.refs.some(k => /:AC-\d+@/.test(k))) issues.push(`${d.key}: missing acceptance reference.`);
    if (d.id.startsWith('RUN-') && !d.refs.some(k => /:TC-\d+@/.test(k))) issues.push(`${d.key}: missing versioned case reference.`);
    if (d.id.startsWith('TC-') && d.namespace === 'local' && !d.refs.length) issues.push(`${d.key}: missing acceptance or risk basis.`);
    if (d.id.startsWith('AC-') && state.stageRuns.some(r => ['test-design','verify'].includes(r.stage) && r.progress === 'done') && !defs.some(t => t.status === 'current' && t.id.startsWith('TC-') && t.refs.includes(d.key))) issues.push(`${d.key}: no current case coverage.`);
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
