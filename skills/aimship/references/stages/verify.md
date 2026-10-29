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

## Artifact contract

Use testing.md. Preserve the ordinary template headings and section order. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

Append RUN records in testing.md, citing TC numbers, the tested document version and exact objects. Evidence goes in .aimship/evidence/; no installation diagnostics or repeated state output in ordinary deliveries.

After completing and self-checking this stage, save its result and current stop. Report the artifacts and next action, then stop. Wait for continuation without adding a document approval; final handoff instead awaits the actual acceptance decision. Failures remain unresolved until repaired and checked.
