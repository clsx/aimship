// Explicit synthetic business content for state/approval tests, not user data.
import { artifactMap } from '../../lib/documents.mjs';
export async function documentFixture(kind, language='en', records=true) {
  const spec=(await artifactMap()).documents[kind];
  const entries={
    adoption:'| REQ-001 | Adopt the selected-order export requirement from the supplied source; see AC-001. |',
    requirements:'| REQ-001 | Export the selected orders with their exact totals; see AC-001. |',
    acceptance:'| AC-001 | For REQ-001, exporting two selected orders returns exactly two matching totals. |',
    cases:'| TC-001 | For AC-001, select two orders and compare exported totals to their stored values. |',
    tasks:'| TASK-001 | Implement the selected-order export described by REQ-001. |'
  };
  return `# Synthetic ${kind}\n\n`+spec.sections.map((id,i)=>`## ${spec.headings[language][i]}\n\nSynthetic ${id}: scoped selected-order export; record the actual outcome here.\n${records?(entries[id]??''):''}\n`).join('\n');
}
