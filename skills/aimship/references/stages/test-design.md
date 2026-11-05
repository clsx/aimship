# Design verification

## Inputs

Read current acceptance criteria, constraints, design/contracts, independent SQL and identified risks.

## Goal and scope

Design appropriate checks for the current acceptance criteria and risks, without claiming execution.

## Actions

Map requirements, acceptance and risks to observable normal, boundary/error and regression checks. Reuse the project's test tools and choose methods where useful: units for logic/state, interface/integration checks for service/data collaboration, component/browser/E2E for interaction paths, targeted performance or security checks for relevant requirements/risks. Explain the choices and execution conditions; no fixed category count or coverage target. Identify tools/commands, isolated data and authorization needs. Preserve checks whose conditions are absent; distinguish what must be verified from what can run now. Implementation checks, batch/overall code review and final formal verification have distinct scopes; a mock result is not real integration evidence. State the actual project execution conditions, including a deployed test environment where needed, without inventing a universal deployment prerequisite or an Aimship deployment stage.

Missing tools or execution authority do not justify deleting a valid case. Clarify acceptance omissions through current requirements rather than measuring only test count.

Use the [testing template](../templates/testing.md): short case index followed by one substantive definition per TC, ordered steps and corresponding assertions, explicit data combinations and assertion locations. Check AC/rules, interface branches and page states against cases. Missing conditions remain gaps, never deleted cases or assumed execution.

For later edits, apply [in-place revision rules](../document-revisions.md); keep the same required fields and identities.

## Outputs and result

Use testing.md.

## Completion and stop

The goal and material risks have appropriate checks and missing execution conditions are explicit. Complete and obtain approval of cases/coverage before the selected plan stage. Write them in testing.md; execution remains explicitly not run until verify.

Self-check the selected outputs and stop for their [current-content review](../document-review.md); unchanged supplied inputs follow the shared adoption rules. Production done is separate from approval.
