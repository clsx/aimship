# Review the current batch

## Inputs

The current B/TASK definitions, implemented run/object, applicable requirements/design/contracts and any repair/check evidence.

## Goal and scope

Examine this batch and its necessary interfaces before another business batch begins. This is part of the authorized implementation work unit.

## Actions

Apply the [shared review method](../review-method.md). Keep repairs inside the current business batch: update its existing implementation checkpoint and plan execution evidence, retain its batch purpose and prior object/result references, and save a separate review/recheck. A failed batch is not a new implementation batch. Repair findings within the existing commission and recheck the changed object; route requirement/design changes or missing permission to their actual decision. Do not expand a batch review into full formal verification or a repository-wide rewrite.

## Outputs and result

A batch REV with reviewOf naming the actual implementation/repair runs, no overall flag, and a concise finding/repair conclusion. Update the single plan execution table and references; keep review details here, not copied into plan/testing.

## Completion and stop

Keep implementation and review facts separate. Continue authorized repair/recheck inside this batch; report and stop after its passing review, or at an actual unresolved dependency. Next-batch continuation remains a user boundary. Merely having one batch does not silently replace an overall review.
