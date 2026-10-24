// Synthetic evidence only. Never used by the installed workflow to approve real documents.
import fs from 'node:fs/promises';
import path from 'node:path';
import { reviewFingerprint } from '../../lib/approvals.mjs';
export async function approveFixture(directory, state, files) {
  const sourceRef = 'source/synthetic-review.md';
  await fs.writeFile(path.join(directory,sourceRef), '# Synthetic review driver\nTest fixture only; not a real user decision. The harness explicitly approves each supplied document version after its synthetic self-check.\n');
  const records = [...(state.reviewHistory ?? [])];
  for (const file of files) {
    const doc = state.documents.find(d=>d.path===file);
    const basis = {document:file,version:doc.version,digest:await reviewFingerprint(directory,state,doc),sourceRef,summary:'Synthetic fixture self-check / explicit approval; not host E2E.'};
    records.push({...basis,id:`fixture-${records.length+1}`,kind:'self-check',result:'passed'});
    records.push({...basis,id:`fixture-${records.length+1}`,kind:'approved',decision:'explicit-approval'});
  }
  return records;
}
