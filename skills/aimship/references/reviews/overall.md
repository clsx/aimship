# Review the whole change

## Inputs

The current requirement/design/contract/plan, all completed batches and repairs, their passing reviews, and the actual combined object.

## Goal and scope

Find cross-batch consistency, shared-rule and integration defects that individual batch reviews cannot establish. An explicit overall-review request commissions review, not automatic full testing or deployment.

## Actions

Apply the [shared review method](../review-method.md) to the combined scope, including repair changes. Examine cross-batch connections, requirement/design/contract consistency and actual logic, transactions/data consistency, state transitions and failure/exception paths where relevant. Check whether the approach is correct in the actual project, not only whether code copied the design. Route a material design defect back to its real decision and review affected changes; do not expand into unrelated historical cleanup. Reference local checks without claiming formal runtime verification.

Apply [in-place revision rules](../document-revisions.md). Preserve approved definitions; record detailed REV/RUN history in its owning document and keep only one state-generated current result. A formal TC pass requires every defined combination and assertion; partial execution is not whole-case coverage.

## Outputs and result

An independent overall REV with reviewScope: overall, reviewOf covering all current implementation/repair runs and the combined objectKey. Preserve earlier REV facts and name the exact reviewed basis. This is the existing overall-review stage, not another main stage.

## Completion and stop

Save the overall conclusion and concrete next action, then stop. A passing overall review hands over the reviewed object, actual test-environment preparation and formal verification scope for subsequent authorized execution; it does not deploy or run the tests. A failing review retains its findings and awaits the actual repair work/decision, without inventing a test result.
