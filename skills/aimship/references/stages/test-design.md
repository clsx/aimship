# Design verification

## Basis

Read current acceptance criteria, constraints, design/contracts, independent SQL and identified risks.

## Work and result

Map requirements, acceptance and risks to observable normal, boundary/error and regression checks. Reuse the project's test tools and choose methods where useful: units for logic/state, interface/integration checks for service/data collaboration, component/browser/E2E for interaction paths, targeted performance or security checks for relevant requirements/risks. Explain the choices and execution conditions; no fixed category count or coverage target. Identify tools/commands, isolated data and authorization needs. Preserve checks whose conditions are absent; distinguish what must be verified from what can run now. Implementation checks, batch/overall code review and final independent verification have distinct scopes; a mock result is not real integration evidence.

## Continue when

The goal and material risks have appropriate checks and missing execution conditions are explicit. Complete and obtain approval of cases/coverage before the selected plan stage. Write them in testing.md; execution remains explicitly not run until verify.

## Decisions and blockers

Missing tools or execution authority do not justify deleting a valid case. Clarify acceptance omissions through current requirements rather than measuring only test count.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use testing.md. Preserve the ordinary template headings and section order. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

## Human document review

Apply [document review](../document-review.md): generate → self-check → present the concrete document entry, current review status and focus → wait. Record explicit user approval of this version/content, then follow the core session interaction: stop at this stage boundary; suggest a new session only at a major work boundary, and continue here when requested. Approval and continuation may be expressed together. Questions or edit requests retain the stop; edits require self-check and re-review. Production `done` is separate from approval and final acceptance.
