# Design verification

## Basis

Read current acceptance criteria, constraints, design/contracts, independent SQL and identified risks.

## Work and result

Map each goal/risk to observable checks: normal behavior, relevant errors/boundaries and regression. Identify commands/tools, environment, accounts/data and authorization needs. Preserve checks whose conditions are absent; distinguish what must be verified from what can run now.

## Continue when

The goal and material risks have appropriate checks and missing execution conditions are explicit. Complete and obtain approval of cases/coverage before the selected plan stage. Write them in testing.md; execution remains explicitly not run until verify.

## Decisions and blockers

Missing tools or execution authority do not justify deleting a valid case. Clarify acceptance omissions through current requirements rather than measuring only test count.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use testing.md. Preserve the ordinary template headings and section order. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

## Human document review

Apply [document review](../document-review.md): generate → self-check → present the concrete document entry, current review status and focus → wait. Record explicit user approval of this version/content, then follow the core session interaction: stop at this stage boundary and suggest a new session; continue here when requested. Approval and continuation may be expressed together. Questions or edit requests retain the stop; edits require self-check and re-review. Production `done` is separate from approval and final acceptance.
