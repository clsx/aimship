# Review actual changes

## Basis

Read the applicable requirements, design/contract, batch or overall scope and exact change objects.

## Work and result

Fix the object basis before review: commit plus relevant working differences/untracked paths, or document sections and digests/old excerpts. Check consistency, defects, omissions and scope. Record findings, dispositions and reviewer source. Batch review precedes next batch; overall review checks integration after all batches. Single-batch review may cover both explicitly.

## Continue when

The agreed scope has actually been examined and issues blocking progression are resolved or handled by an explicit change. Keep old conclusions for their old objects.

## Decisions and blockers

Do not replace an agreed human review with agent review. Review cannot be reported as a running test; unrelated work need not be re-reviewed.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use review.md. Preserve the ordinary template headings and section order. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

Record reviewOf with the actual implementation-run IDs; mark overall: true only for an overall review. Batch review and overall review each save their own stage stop, even when their context group is shared. Resolve findings before continuation; a suggestion never substitutes for a passing review.

After completing and self-checking this stage, save its result and current stop. Report the artifacts and next action, then stop. Wait for continuation without adding a document approval; final handoff instead awaits the actual acceptance decision. Failures remain unresolved until repaired and checked.
