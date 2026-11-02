// Explicit synthetic business content for state/approval tests, not user data.
import { artifactMap } from '../../lib/documents.mjs';
export async function documentFixture(kind, language='en', records=true) {
  const spec=(await artifactMap()).documents[kind];
  const entries={
    requirements:'| REQ-001 | Export the selected orders with their exact totals; see AC-001. |',
    acceptance:'| AC-001 | For REQ-001, exporting two selected orders returns exactly two matching totals. |',
    cases:'| TC-001 | For AC-001, select two orders and compare exported totals to their stored values. |',
    tasks:'| TASK-001 | Implement the selected-order export described by REQ-001. |'
  };
  const generated={plan:{execution:['5.1 Current batch progress (generated)','5.2 Execution notes and history']},testing:{runs:['5.1 Current verification (generated)','5.2 Formal runs and retests']},review:{basis:['1.1 Current review (generated)','1.2 Review basis']}};
  const zone=id=>{const names=generated[kind]?.[id];return names?`\n### ${names[0]}\n\nPending state generation.\n\n### ${names[1]}\n\nSynthetic readable evidence and history.\n`:'';};
  return `# Synthetic ${kind}\n\n`+spec.sections.map((id,i)=>`## ${spec.headings[language][i]}\n\nSynthetic ${id}: scoped selected-order export; record the actual outcome here.\n${records?(entries[id]??''):''}\n${zone(id)}`).join('\n');
}
