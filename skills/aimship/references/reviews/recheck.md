# Recheck repaired work

## Inputs

The original REV/findings, actual repair basis, changed implementation object and applicable previous review coverage.

## Goal and scope

Determine whether those findings are resolved and whether the repair creates related defects; preserve the original batch or overall review responsibility.

## Actions

Apply the [shared review method](../review-method.md). Examine the repair and affected dependencies, not an uncommissioned full verification suite. Record open/deferred issues honestly. If the original review was overall, retain overall scope and cover the complete current implementation object.

## Outputs and result

A new REV with the actual reviewOf coverage and historyResultRefs pointing to the superseded review result. Keep old findings and attach the disposition/rechecked object. A correction within the current failed batch updates that batch’s existing implementation checkpoint and execution evidence; the new recheck retains the failed REV. Separate repair work after completed batches uses workType:repair and the actual repairOf basis; it is not a new business batch.

## Completion and stop

A batch recheck completes the batch work unit and stops there. An overall recheck saves its conclusion and stops before formal verification. Unresolved dependencies remain explicit; a new REV without actual examination cannot resolve a failure.
