# Investigate cause or feasibility

## Basis

Read reported symptoms, expected behavior, relevant code/material and reproducible evidence.

## Work and result

Investigate within authorized objects. Record observations, reproduction or supporting evidence, probable/established causes and remaining uncertainty. Keep incidental behavior changes out of a refactor.

## Continue when

The investigation goal is met, or the inability to determine a cause and a concrete next step are accurately stated. A hypothesis is not a confirmed root cause.

## Decisions and blockers

If the apparent small fix expands into behavior or scope changes, explain the impact before dependent implementation.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use diagnosis.md. Preserve the ordinary template headings and section order. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

Only a commissioned independent investigation produces diagnosis.md. Known-cause bugs and normal development debugging stay within their current stage. Record an arrangement change before adding a mid-delivery investigation.

## Human document review

Apply [document review](../document-review.md): generate → self-check → present the concrete document entry, current review status and focus → wait. Record explicit user approval of this version/content, then follow the core session interaction: continue within the group, or suggest a new session at its boundary; continue here if requested. Questions or edit requests retain the stop; edits require self-check and re-review. Production `done` is separate from approval and final acceptance.
