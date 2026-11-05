# Revise the current document in place

Use this procedure on every substantive revision, cleanup and session continuation. The detailed [templates](document-patterns.md#required-outlines) apply after revision as well as on first creation. Preserve adopted inputs according to [source retention](sources-and-changes.md#location-and-version-discipline).

## Current content and history

The top contains only title, delivery identity, document revision, authoritative basis, a short effective summary and an ordinary heading-linked table of contents. Use numbered H2/H3 headings. Do not prepend dated “latest interpretation”, “supplement” or “the above overrides the below” sections. Update the affected current sections and remove superseded proposals from current prose.

| Content | Owning location |
| --- | --- |
| Effective behavior/design, completion criteria, accepted risks, limitations and questions | Corresponding visible formal sections |
| Important decision, before/after, source and scoped impact/action | One CHG in change-log |
| Actual review/execution object, findings, failures and rechecks | REV in review; RUN in testing |
| Earlier full text, investigation scratch work and command output | A distinct path under .aimship/evidence/ with readable references where needed |
| Current batch/review/verification summary | Existing state-generated sections only |

Internal evidence is neither a second authority nor a hidden place for user-relevant risks. Preserve referenced evidence locally; a disposable temporary path must not hold its only copy. Do not copy all artifacts for each punctuation fix. Do not register old snapshots as new current deliverables or fill the artifact list with command logs.

## Revision procedure

1. Locate the current authoritative sections and IDs affected. Classify editorial versus semantic change from meaning, not the size of the edit.
2. Preserve the necessary earlier object/version and immutable evidence before replacing content. Record the actual source of the decision.
3. Rewrite affected prose, diagrams, tables and contract references in place. Keep unchanged IDs and required fields. Withdraw an obligation only with its decision and impact; never silently delete it during cleanup.
4. Record important semantic differences and affected documents/tasks/cases/runs in one CHG. Update all affected current documents; a change log alone cannot explain the effective proposal.
5. Check inventory-to-diagram/method/field coverage, cross-document names, references and the single current result location. Check that TASK/B object and completion columns, TC preconditions/steps/assertions/combinations and visible limitations remain intact. A continuation summary never replaces them.
6. Save using [document review](document-review.md#changes-and-old-states): preserve history, increment semantic document versions, scope reassessment to affected dependencies and keep unrelated results. Recheck and present changed reviewable outputs at their existing review gate. Do not create new gates for logs/results.

An editorial change that leaves fields, relationships, flows, expectations and completion criteria unchanged uses self-check plus the existing editorial reconciliation; it carries valid approval without a new user decision. A change to any of those meanings is substantive. Do not hide new TASK/TC definitions or design changes after the plan/testing approval boundary. Old RUNs retain their original case version and observed result; do not backfill new expectations into old evidence.

## Completion self-check

Read the current document without consulting its history first: the reader must be able to find the effective solution, implementation objects, acceptance/completion conditions and remaining decisions. Then follow CHG and snapshot references to verify what changed. Check the generated summaries against saved state; supply facts through the tool, never edit generated cells to change progress. Check diagrams with a renderer when available and report rendering/inspection gaps honestly; a fenced diagram or syntax check alone does not prove its semantic completeness.
