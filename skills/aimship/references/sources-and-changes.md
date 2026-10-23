# Sources, artifacts and change flow

## Adopt without rewriting the source

Preserve the original request once. For external PRDs, prototypes and images keep the original and necessary adopted version read-only. Keep referenced HTML/Markdown assets when needed to understand that version. A mutable URL alone cannot establish what was adopted. Record origin, location, version/digest, adopted sections and reading gaps. Do not claim visual understanding from text extraction or file storage.

Use existing requirement IDs. If none exist, assign local IDs mapped to source sections, pages, prototype screens or short excerpts. Scope records the current goal, inclusion/exclusion, source mappings, acceptance, constraints, conflicts and adopted decisions. Do not transcribe an entire adequate PRD or create a second one merely to fit a template. Self-owned requirements may also carry Scope.

A prototype and PRD can disagree; neither file type nor modification date automatically wins. Record the conflict and decision authority. Pause dependent work when a material answer is missing, while continuing independent authorized work. Do not contact the external author automatically. If a new version arrives, adopt it separately, assess relevant differences and retain the old basis. Indicate any external document still awaiting its author's correction.

## Artifact boundaries

Use relative references within the delivery. Identify engineering files by repository ID and repository-relative path; keep local repository locations in the user's delivery state, not public product content. Record role, authorization and relevant working version. Do not store credential-bearing remote URLs.

For HTTP interfaces, reuse the engineering repository's authoritative OpenAPI; only create a delivery-local contract when none exists. Other protocols use the appropriate engineering format. Explain decisions in technical design and link details rather than duplicating the contract. No interface change means no mandatory contract.

When the design changes a table, column, index or data, produce a separate SQL file in the delivery directory, with technical design describing dialect/version, existing schema basis, preconditions, sequence and relevant data impact. SQL is an ordinary formal artifact, with the same review/change rules as designs and tests. A code block or reference to an engineering migration does not replace it. Default scope does not edit migration files or execute SQL. Explicitly authorized integration/execution is handled within its environment and recorded file version; prepared, reviewed, tested and production-applied remain distinct. Missing dialect/schema details prevent an implementation-ready claim.

Markdown/HTML are principal carriers, not a format whitelist. Images, screenshots, wireframes and diagrams can be sources or outputs. Record separately text reading, visual inspection, interaction checks, generation and native-format editing. PDF/DOCX/online inputs depend on available tools and access. Missing tools require an honest gap and a feasible alternative; changing agreed output requires a decision. A still image does not establish interactions, error states, permissions or responsiveness. Never add a universal conversion service to the task.

## One record for an important change

1. Persist the reason, old/new intent, decision/source or open question, affected artifacts/runs and uncertainties in one change record.
2. Update editable requirements/Scope, design, contracts, independent SQL, plan and test cases where affected. Preserve external sources and necessary old excerpts.
3. Mark affected conclusions as needing review; historical records keep their original object and outcome. Leave unrelated results intact.
4. Review affected work and execute affected verification as required by the goal, then close the same change with its result and remaining issues.

Formatting/typo corrections do not require semantic re-review. Implementation bugs are fixed against the requirements; do not weaken the requirements to match the bug. Tools detect structural problems, not every semantic dependency. State uncertainty in the impact analysis rather than claiming complete automatic coverage.

## Location and version discipline

Preserve raw adopted versions under source/, including source/request.md. Author current requirements in prd.md or adopt authoritative material through scope.md. Formal outputs remain at the delivery root. New source versions are additional records, never replacements of adopted originals. Normal business evidence belongs in .aimship/evidence/; installation diagnostics and repeated state returns belong in product-maintainer validation, not the delivery.

Use CHG for significant changes, stable REQ/AC and exact TC versions. Retain failed RUN and historical REV records. Q closes only after its decision also reaches the affected formal text. See document-patterns for namespaces, retired IDs, split/merge mapping and structure. An explicit full export must identify its date and object/version and remain a snapshot.
