# Design verification

## Basis

Read current acceptance criteria, constraints, design/contracts, independent SQL and identified risks.

## Work and result

Map each goal/risk to observable checks: normal behavior, relevant errors/boundaries and regression. Identify commands/tools, environment, accounts/data and authorization needs. Preserve checks whose conditions are absent; distinguish what must be verified from what can run now.

## Continue when

The goal and material risks have appropriate checks and missing execution conditions are explicit. Write cases and coverage in testing.md; execution remains explicitly not run until verify.

## Decisions and blockers

Missing tools or execution authority do not justify deleting a valid case. Clarify acceptance omissions through current requirements rather than measuring only test count.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use testing.md. Preserve the `cases` section anchor. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.
