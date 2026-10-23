import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { listFiles } from '../lib/io.mjs';
import { STAGES } from '../lib/state.mjs';
import { anchors, artifactMap } from '../lib/documents.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),map=await artifactMap();
assert.deepEqual(Object.keys(map.stages).sort(),[...STAGES].sort());
for(const [kind,spec] of Object.entries(map.documents)) {
 const text=await fs.readFile(path.join(root,`skills/aimship/references/templates/${kind}.md`),'utf8');assert.deepEqual(anchors(text),spec.sections,kind);
}
const files=[...await listFiles(path.join(root,'docs'))].map(f=>'docs/'+f).concat((await listFiles(path.join(root,'skills'))).filter(f=>f.endsWith('.md')).map(f=>'skills/'+f),['README.md','README.zh-CN.md','CONTRIBUTING.md']);
let checked=0;
for(const file of files.filter(f=>f.endsWith('.md'))) {
 const text=await fs.readFile(path.join(root,file),'utf8');
 for(const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  const ref=match[1];if(/^(https?:|#|<|\{)/.test(ref))continue;
  const target=path.resolve(root,path.dirname(file),ref.split('#')[0]);
  await fs.access(target);checked++;
  const fragment=ref.split('#')[1];if(fragment && target.endsWith('.md')) {
   const content=await fs.readFile(target,'utf8');const slugs=[...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m=>m[1].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s+/g,'-'));
   assert.ok([...anchors(content),...slugs].includes(fragment),`${file} → ${ref}`);
  }
 }
}
console.log(JSON.stringify({ok:true,stages:STAGES.length,templates:Object.keys(map.documents).length,relativeLinks:checked,scope:'Public documentation links and shared stage/template mapping; not semantic acceptance.'},null,2));
