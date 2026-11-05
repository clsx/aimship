# Implement the current work unit

## Inputs

Read this run’s scope, current approved requirements/design/contracts, its registered B/TASK definitions and pre-existing changes. Use the [shared project context](../core.md#project-context-and-decisions) and applicable repository instructions.

## Goal and scope

Complete one authorized business batch or repair, including necessary local checks and the matching review/recheck; do not begin another batch.

## Actions

Use the [shared start/continuation sequence](../core.md#begin-or-resume-the-selected-work): save the batch’s ordinary active start and inspect its result before code changes; reuse that record when continuing the same active batch. Before entering implementation, or when a code working directory changes, apply the [recorded-overlap check](../core.md#independent-deliveries-and-recorded-overlap). Reuse an existing user-selected sequence or isolated checkout; unresolved same-checkout writing overlap holds the affected code writes, not independent design work. Complete this batch using the existing engineering stack. Write planned test code where appropriate. Preserve user work and external sources. Record deviations and route semantic changes through the current authority, including SQL when affected. Engineering commands use the repository working directory.

Expanded external behavior, data handling or authorization needs return to the relevant decision. A rejected permission remains blocked and is not retried through another host.

Apply [in-place revision rules](../document-revisions.md). Preserve approved definitions; record detailed REV/RUN history in its owning document and keep only one state-generated current result. A formal TC pass requires every defined combination and assertion; partial execution is not whole-case coverage.

## Outputs and result

Use plan.md.

Record actual implementation facts through domain operations with workType, the stable batchId when applicable, objectKey and result references. plan.md’s generated batch table reflects that state; keep brief development checks, necessary execution notes and existing evidence references in its AI-maintained execution section. Keep approved B/TASK definitions unchanged unless the plan itself changes; preserve planned versus actual and code versions. Do not generate implementation.md or a second task-status ledger.

## Completion and stop

Save the implementation checkpoint, then continue directly to [batch review](../reviews/batch.md) for business work, or [repair recheck](../reviews/recheck.md) preserving the original batch/overall scope for repair work. Keep separate implement/review runs; the checkpoint is not another user continuation request. Mark implementation workType as batch for planned business work, or repair with repairOf pointing to its actual preceding basis. Record each repair as new work with the applicable batchId and actual repairOf/history result basis; preserve completed records. Do not infer its responsibility from an ID. Use [conditional host delegation](../core.md#conditional-host-delegation) only where it helps; the main agent remains responsible for integration and batch review.

After the batch review passes and the facts/projections are saved, report the batch result and stop before the next batch. If it was the last batch, summarize the implementation and remaining work, then recommend a new session for overall review. Only explicit authorization permits that overall review in the current session; do not start it automatically. On a real scope, permission, approval or unresolved technical dependency, stop at that issue rather than claiming the batch passed. Local checks remain brief execution notes and evidence references; formal RUNs belong to post-overall-review verification.
