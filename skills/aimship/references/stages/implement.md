# Implement the current work unit

## Inputs

Read this run’s scope, current requirements/design/contracts, relevant repository instructions and pre-existing changes.

## Goal and scope

Complete one authorized business batch or repair, including necessary local checks and the matching review/recheck; do not begin another batch.

## Actions

Before entering implementation, or when a code working directory changes, apply the [recorded-overlap check](../core.md#independent-deliveries-and-recorded-overlap). Reuse an existing user-selected sequence or isolated checkout; unresolved same-checkout writing overlap holds the affected code writes, not independent design work. Complete this batch using the existing engineering stack. Write planned test code where appropriate. Preserve user work and external sources. Record deviations and route semantic changes through the current authority, including SQL when affected. Engineering commands use the repository working directory.

Expanded external behavior, data handling or authorization needs return to the relevant decision. A rejected permission remains blocked and is not retried through another host.

## Outputs and result

Use plan.md.

Update TASK/B status and actual execution in plan.md's execution section, citing the existing task/batch numbers. Keep approved task definitions unchanged unless the plan itself changes; preserve planned versus actual and code versions. Do not generate implementation.md.

## Completion and stop

Save the implementation checkpoint, then continue directly to [batch review](../reviews/batch.md) for business work, or [repair recheck](../reviews/recheck.md) preserving the original batch/overall scope for repair work. Keep separate implement/review runs; the checkpoint is not another user continuation request. Mark implementation workType as batch for planned business work, or repair with repairOf pointing to its actual preceding basis. For old work after an overall review, inspect the plan/review before assigning the purpose; never infer it from an ID.

After the batch review passes and the current plan status/references are saved, report the batch result and stop before the next batch or overall review. On a real scope, permission, approval or unresolved technical dependency, stop at that issue rather than claiming the batch passed. Local checks remain brief execution notes and evidence references; formal RUNs belong to post-overall-review verification.
