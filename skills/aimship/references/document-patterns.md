# Delivery documents and traceability

[artifact-map.json](artifact-map.json) is the shared mapping for stages, templates and checks. Use [templates](templates/prd.md) for newly authored documents; preserve the ordinary section headings and their order, write visible headings and body in the saved delivery language, and explain inapplicable sections. Use the English or Chinese headings listed in the artifact map; numbered heading prefixes are optional. Keep business IDs and file paths unchanged. Original sources and existing documents are not automatically translated when the language changes. Templates are drafting guidance, not empty artifacts to generate for every delivery.

One request has one directory. New deliveries default to separate folders under the bound dataRoot; formal documents are at the delivery folder’s root, not at dataRoot or the current project merely because materials already exist there. `source/request.md` preserves the original commission or source entry; other adopted versions stay in `source/` without overwriting. Follow [source retention and editing boundaries](sources-and-changes.md#location-and-version-discipline) for originals, necessary resources and subsequent versions. State, recovery copies, necessary evidence and generated AI-tool configuration belong under `.aimship/`. Generated `status.md` is the reading entry; no default INDEX, docs/sql hierarchy, AI copy, transcript or full export. A requested export is a dated object/version snapshot, never an editing authority.

## Input and output conditions

Initialization may start with preserved source/request.md before a PRD is formed. Do not generate an empty template for init. Register the substantive requirement draft and switch goalRef when ready; before completing requirements or dependent work, use the existing formal artifact and approval rules below. Unknown artifact conditions stay null until determined, distinct from false/none/[] (not applicable).

Use one registered PRD as the requirement authority. If an existing PRD fully fits this commission, retain its adopted version in source/ and register that file as kind prd, mode reused, authority adopted; keep its text, numbering and outline unchanged. If only part applies, author prd.md for this iteration with source/version, included and excluded work and acceptance; retain corresponding original business IDs. Without a PRD, clarify the request and write prd.md. There is no separate Scope document or approval. Existing approval is reusable only with actual evidence for the current content; otherwise confirm requirements. Adoption alone is not approval.

A prototype is optional according to the work. Reuse adequate supplied material; create a prototype only when it helps clarify the agreed interaction and is selected for this delivery. Otherwise describe behavior in the PRD/design. A selected prototype keeps its document approval before implementation. New HTML uses `prototype/index.html`; other agreed formats may be registered.

`test-design` precedes `plan` in standard delivery; both reviewable documents need explicit approval. If the user explicitly excludes cases/testing, record the limited scope once and do not generate empty testing artifacts or call the result standard complete delivery. `plan` must finish before first implementation, even one small batch. `plan.md` holds both planned TASK/B records and actual execution, distinctly; state holds stage progress. `testing.md` holds cases/coverage and appended RUN records; verification follows overall review. Verify-only may register existing cases with version/coverage, without claiming test-design occurred. Review-only does not require implementation/tests. No arbitrary small-task merging, `implementation.md`, `test-plan.md`, `verification.md`, or `results.md` for new work.

Use `tech-design.md`. HTTP changes use `openapi.yaml` or the registered engineering authority; no extra contract wrapper. Non-HTTP formats are explicitly registered. Database changes require independent `database.sql` (one target) or `database-<id>.sql` per target in contract, after technical-design approval and before test cases. Technical design records the data approach and SQL plan without requiring finished SQL. SQL headers identify target/dialect/version/schema basis/conditions; ordered sections cite requirements/design. Never substitute a Markdown block or migration reference, or execute/change migration mechanisms without authorization.

`diagnosis.md` belongs only to an explicitly selected independent investigation. Known-cause bugs and ordinary development debugging do not add diagnose. Major unknowns require a recorded stage adjustment; hold dependent work. Implementation defects go to implementation, design errors to design, requirement gaps to PRD, incorrect expectations to the testing document.

## Identities and references

Use readable IDs for different entities: REQ for requirements, AC for acceptance, TASK/B for implementation, TC for cases, REV/RUN for review/execution records, and CHG/Q/PAGE where useful. Start each kind at 001. Keep the same obligation's ID across documents; do not give different entities the same ID. Users should be able to search an ID in ordinary Markdown. Do not require hyperlinks or any reader's HTML support.

Define each ID once in its owning document, in a table's first column, a heading or a bullet, with substantive content: REQ/AC and optional PAGE mappings in PRD, TASK/B in plan, TC/RUN in testing, REV in review, CHG in change log. Put requirements, acceptance, batches, tasks and cases in their existing corresponding sections. The same document's coverage, summaries and execution records, as well as other documents, may cite those numbers in prose or tables without redefining them. Q records may be defined where the question is resolved. For example:

```markdown
| ID | Requirement | Acceptance |
| --- | --- | --- |
| REQ-001 | Usernames must be unique; duplicates show an error. | AC-001 |

| ID | Acceptance criterion |
| --- | --- |
| AC-001 | For REQ-001, registering an existing username leaves data unchanged and displays the duplicate-name error. |
```

A case can define TC-001 and cite AC-001; its later RUN record cites TC-001. Use a distinct REV/RUN number for each actual review/execution and retain failed records. State identifies which implementation a review covers; ordinary record text identifies tested code, commands, results and evidence. Document versions and content-bound approval remain required; there is no per-item version/namespace/retirement protocol.

Bare IDs refer to the current local authority. To cite an external number, use that ID as the visible label of a link to its Markdown source file; the reader opens the file and searches the number. A file-qualified record locator is also checked without requiring a working browser anchor. The file must be readable and the numbered record unique and substantive; a path alone is not proof. An explicitly registered reused Markdown PRD may supply readable business IDs and acceptance definitions without being copied or forced into this outline; unparsed source content remains unchecked. Preserve originals and source-retention boundaries.

Do not insert HTML anchor tags, machine JSON comments, an index, sidecar or traceability matrix. Do not automatically renumber unchanged requirements. Keep adopted business IDs (for example FR-001 and AC-001); a partial-iteration PRD describes their source correspondence without new numbering. Basic checks recognize local IDs in definitions and citations, reject duplicates, missing references and empty records, and require substantive requirement/AC, TC or TASK records in newly authored documents when completing their respective work or recording a passing document self-check. Define B records in the batch section, TASK records in the task section and TC records in the case section, never below the execution boundary. Execution text may cite existing batches, tasks and cases. These checks do not prove that every business obligation or test assertion is covered; the Agent and document review must check meaning.

## Saving and checking

Register `documentPolicy` and `documents` per [CLI](../../../docs/cli.md). Draft at stage start; completion requires the mapped artifact and a searchable section or result record, not merely a filename. Internal file#locator references denote a template section key, unique ordinary heading or record ID; they need not be clickable. Use file links and visible locator text when presenting results. Reused/remote/binary material needs recorded basis and explicit unchecked scope. Local references remain relative to delivery root even though JSON moved internally.

Save unfinished intent, update formal documents, inspect them, then revision-check state. A matching status revision does not prove documents unchanged. Read/check/resume diagnose only. A saved state with a failed view must be repaired using render at the returned revision, never replayed. Preserve hand-edited status before rebuilding and interpret intent against existing authority; it cannot confer acceptance or publishing permission.

Preserve the fixed outlines and identity rules during [document review](document-review.md). Plan/testing design approval excludes their later execution/result sections; keep actual execution there.
