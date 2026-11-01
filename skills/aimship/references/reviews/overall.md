# Review the whole change

## Inputs

The current requirement/design/contract/plan, all completed batches and repairs, their passing reviews, and the actual combined object.

## Goal and scope

Find cross-batch consistency, shared-rule and integration defects that individual batch reviews cannot establish. An explicit overall-review request commissions review, not automatic full testing or deployment.

## Actions

Apply the [shared review method](../review-method.md) to the combined scope, including repair changes. Inspect requirement coverage, shared boundaries, omissions and unresolved findings. Reference local checks without claiming formal runtime verification. If a single-batch commission explicitly covers both review responsibilities, examine and record both scopes; do not infer that commission from batch count alone.

## Outputs and result

An independent overall REV, overall:true and reviewOf covering all current implementation runs, including repairs. Preserve earlier review conclusions and name the exact reviewed basis.

## Completion and stop

Save the overall conclusion and concrete next action, then stop. A passing overall review permits subsequent authorized formal verification; it does not execute it. A failing review retains its findings and awaits the actual repair work/decision, without inventing a test result.
