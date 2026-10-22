# Design verification

## Basis

Read current acceptance criteria, constraints, design/contracts, independent SQL and identified risks.

## Work and result

Map each goal/risk to observable checks: normal behavior, relevant errors/boundaries and regression. Identify commands/tools, environment, accounts/data and authorization needs. Preserve checks whose conditions are absent; distinguish what must be verified from what can run now.

## Continue when

The goal and material risks have appropriate checks and missing execution conditions are explicit. Simple checklists may share a later report.

## Decisions and blockers

Missing tools or execution authority do not justify deleting a valid case. Clarify acceptance omissions through current requirements rather than measuring only test count.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.
