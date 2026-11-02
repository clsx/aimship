# Execute verification

## Inputs

Read current acceptance criteria and case/coverage definitions, the passing overall review of the current object, any later repair reviews and the agreed execution conditions.

## Goal and scope

Execute only the agreed formal verification scope after passing overall review, preserving failures and retests.

## Actions

Execute the agreed checks on identified objects. Optional verification groups follow actual coverage and conditions, not implementation batches; a retest is another RUN in the same scope, not a new development batch. Local unit checks need no deployment. Preserve commands/operations, environment/data, expected assertions, actual results and sufficient evidence. Separate pass/fail/not-run/unknown. On defects repair the affected implementation, review the repair, then retest affected cases; append the new result and retain the old failure.

Use the agreed real environment: if this project’s formal tests require deployment to a test environment, hand over that preparation and wait until it is ready. Do not initiate deployment, add a deployment stage or impose deployment on checks that need none. Unavailable environment or authority stays explicit with a recovery action. Do not lower criteria, skip assertions or mark a case passed because a command exited successfully.

## Outputs and result

Use testing.md.

Append formal RUN records only in testing.md’s AI-maintained execution section, citing TC numbers or adopted coverage references, the tested document version and exact objects. Submit each execution through record-run with its coverageRefs and objectKey, using per-coverage results when they differ. The generated current summary derives from those facts; do not hand-write a competing pass/fail table. A partial retest resolves only the matching prior coverage; retain failed RUNs and cite them through historyResultRefs. Reusing a previous object’s result requires an assessment of its applicability to the specific current object, not a renamed old result. Evidence goes in .aimship/evidence/; no installation diagnostics or repeated state output in ordinary deliveries.

## Completion and stop

The agreed execution work is accounted for with traceable results. This run can end with failure or gaps; that does not make the development goal met.

Save the actual result, then stop at this stage boundary. Use the [shared lifecycle](../core.md#state-and-stopping) for continuation.
