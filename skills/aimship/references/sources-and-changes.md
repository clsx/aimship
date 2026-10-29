# Sources, artifacts and change flow

## Adopt without rewriting the source

Preserve the original request once. If source/request.md changes after initialization, restore its original bytes before continuing state writes; an unrelated update must not adopt a new source digest. Record subsequent intent in the editable PRD and a CHG when meaning changes. If the original cannot be recovered reliably, preserve the conflicting material and report the blocker instead of replacing the recorded basis. Preserve external PRD, prototype, handover-note and image originals at their supplied locations. Retain the adopted versions as described under [location and version discipline](#location-and-version-discipline); neither storing files nor extracting text establishes visual or interaction validation.

Use existing requirement IDs. If none exist, assign local IDs mapped to source sections, pages, prototype screens or short excerpts. A partial-iteration PRD records the current goal, inclusion/exclusion, sources, acceptance, constraints and decisions. A complete applicable supplied PRD is adopted directly as mode input when the user’s delivery intent is clear; basisRef preserves that actual request. Source snapshots and adoption/self-check records are not AI deliverable documents to ask the user to review. Do not transcribe an entire adequate PRD or create a second one merely to fit a template.

A prototype and PRD can disagree; neither file type nor modification date automatically wins. Record the conflict and decision authority. Pause dependent work when a material answer is missing, while continuing independent authorized work. Do not contact the external author automatically. If a new version arrives, adopt it separately, assess relevant differences and retain the old basis. A supplied unchanged version uses its actual adoption request and self-check; AI-authored affected outputs return to review, rather than asking for a source approval. Indicate any external document still awaiting its author's correction.

## Artifact boundaries

Use relative references within the delivery. Identify engineering files by repository ID and repository-relative path; keep local repository locations in the user's delivery state, not public product content. Record role, authorization and relevant working version. Do not store credential-bearing remote URLs.

For HTTP interfaces, reuse the engineering repository's authoritative OpenAPI; only create a delivery-local contract when none exists. Other protocols use the appropriate engineering format. Explain decisions in technical design and link details rather than duplicating the contract. No interface change means no mandatory contract.

When the design changes a table, column, index or data, produce a separate SQL file in the delivery directory, with technical design describing dialect/version, existing schema basis, preconditions, sequence and relevant data impact. SQL is an ordinary formal artifact, with the same review/change rules as designs and tests. A code block or reference to an engineering migration does not replace it. Default scope does not edit migration files or execute SQL. Explicitly authorized integration/execution is handled within its environment and recorded file version; prepared, reviewed, tested and production-applied remain distinct. Missing dialect/schema details prevent an implementation-ready claim.

Markdown/HTML are principal carriers, not a format whitelist. Images, screenshots, wireframes and diagrams can be sources or outputs. Record separately text reading, visual inspection, interaction checks, generation and native-format editing. PDF/DOCX/online inputs depend on available tools and access. Missing tools require an honest gap and a feasible alternative; changing agreed output requires a decision. A still image does not establish interactions, error states, permissions or responsiveness. Never add a universal conversion service to the task.

## One record for an important change

1. Persist the reason, old/new intent, decision/source or open question, affected artifacts/runs and uncertainties in one change record.
2. Update editable requirements, design, contracts, independent SQL, plan and test cases where affected. Preserve external sources and necessary old excerpts.
3. Mark affected conclusions as needing review; historical records keep their original object and outcome. Leave unrelated results intact.
4. Review affected work and execute affected verification as required by the goal, then close the same change with its result and remaining issues.

Formatting/typo corrections do not require semantic re-review. Implementation bugs are fixed against the requirements; do not weaken the requirements to match the bug. Tools detect structural problems, not every semantic dependency. State uncertainty in the impact analysis rather than claiming complete automatic coverage.

## Location and version discipline

The agent preserves the necessary formally adopted versions under `source/`, alongside `source/request.md`; the user need not move or manually copy originals. This is source evidence retention, not a second editable delivery or automatic synchronization.

- Retain the adopted PRD, prototype, handover notes or images, plus HTML/Markdown images, styles, scripts and other resources needed to read or operate that adopted version. Do not copy unrelated workspace files. Background material that is only consulted need not be imported as a whole.
- In the existing adoption evidence referenced by basisRef, or the current PRD when authoring it, identify the original location, retained version/path and version or digest, adopted scope, and any missing resources or reading limits. An unpinned mutable URL is insufficient evidence. If access or tools prevent retention, report the precise gap and hold conclusions that require it; never claim the adopted set is complete.
- Keep `source/` versions read-only as adopted evidence. Name the actual editable document or prototype before revising it. New formal requirements use `prd.md`; a newly authored HTML prototype uses `prototype/index.html`. An external original is editable only when explicitly authorized; a retained source copy does not become that editable authority by default.
- When adopting a new PRD version or replacing it with an editable iteration PRD, retain the previous file as kind source, register the new current kind prd and update goalRef with the actual decision. Keep prior result references in the existing requirement run, record the CHG impact and re-review affected work; the previous approval does not approve the new content. Do not overwrite the earlier adopted version or silently synchronize either direction. Preserve the origin-to-version mapping so there is one clear current basis.

The CLI checks registered paths, artifacts and review evidence; it does not import materials, discover every asset dependency or prove a snapshot is complete. Normal business evidence belongs in .aimship/evidence/; installation diagnostics and repeated state returns belong in product-maintainer validation, not the delivery.

Use CHG for significant changes, stable REQ/AC/TC numbers and the actual tested document/code version. Retain failed RUN and historical REV records. Q closes only after its decision also reaches the affected formal text. See document-patterns for ordinary numbered definitions, references and structure. An explicit full export must identify its date and object/version and remain a snapshot.

Follow [document review](document-review.md) for saved review stops, approval history, exact content versions, affected dependency re-review and current document checks. Read/resume never infer approval from done or create a new user decision.
