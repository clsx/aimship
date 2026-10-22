# Execute verification

## Basis

Read current acceptance criteria, the verification plan, actual reviewed results and execution conditions.

## Work and result

Execute the agreed checks on identified objects. Preserve commands/operations, environment/data, expected assertions, actual results and sufficient evidence. Separate pass/fail/not-run/unknown. On defects repair the affected implementation, review the repair, then retest affected cases; append the new result and retain the old failure.

## Continue when

The agreed execution work is accounted for with traceable results. This run can end with failure or gaps; that does not make the development goal met.

## Decisions and blockers

Unavailable environment or authority stays explicit with a recovery action. Do not lower criteria, skip assertions or mark a case passed because a command exited successfully.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.
