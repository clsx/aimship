# Execute verification

## Inputs

Read current acceptance criteria, the verification plan, actual reviewed results and execution conditions.

## Goal and scope

Execute only the agreed formal verification scope after passing overall review, preserving failures and retests.

## Actions

Execute the agreed checks on identified objects. Optional verification groups follow actual coverage and conditions, not implementation batches; a retest is another RUN in the same scope, not a new development batch. Local unit checks need no deployment. Preserve commands/operations, environment/data, expected assertions, actual results and sufficient evidence. Separate pass/fail/not-run/unknown. On defects repair the affected implementation, review the repair, then retest affected cases; append the new result and retain the old failure.

Unavailable environment or authority stays explicit with a recovery action. Do not lower criteria, skip assertions or mark a case passed because a command exited successfully.

## Outputs and result

Use testing.md.

Append formal RUN records only in testing.md's execution section, citing TC numbers, the tested document version and exact objects. Evidence goes in .aimship/evidence/; no installation diagnostics or repeated state output in ordinary deliveries.

## Completion and stop

The agreed execution work is accounted for with traceable results. This run can end with failure or gaps; that does not make the development goal met.

Save the actual result, then stop at this stage boundary. Use the [shared lifecycle](../core.md#state-and-stopping) for continuation.
