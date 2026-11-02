# Select the review responsibility

## Inputs

The saved current scope, reviewed object and relevant approved requirements/design/contracts/plan; read reviewScope, reviewOf, batchId and any prior REV/repair relationship. Use the [shared project context](../core.md#project-context-and-decisions).

## Goal and scope

Choose one clear review contract. Stage remains review; these are internal execution modules, not separate user commands or registered Skills.

## Actions

- Current implementation batch: use [batch review](../reviews/batch.md).
- Explicit overall review after all batches: use [overall review](../reviews/overall.md).
- Repaired prior findings: use [recheck](../reviews/recheck.md), retaining the original batch/overall scope.

If the scope is not recorded, inspect the existing plan/review and actual request before acting. Do not infer permission for a full test suite from a review request.

## Outputs and result

The selected module's actual REV and state references in review.md. Common assessment/finding rules live in the [shared method](../review-method.md).

## Completion and stop

Follow that module's work-unit boundary: batch review/authorized repair closes the batch; overall/recheck conclusions stop before formal verify. Document approvals remain governed by [document review](../document-review.md).
