# Design interaction

## Basis

Read current requirements, applicable design conventions and any supplied prototype or UI images.

## Work and result

Describe or build the relevant flow, screens, key loading/empty/error/success and permission states, feedback and responsive behavior where relevant. Link each part to its requirement. Visually inspect/operate actual HTML when claiming layout or interaction validation, with available tools.

## Continue when

The relevant interactions and states are clear and consistent with current requirements. A saved image or HTML source is not evidence of visual inspection.

## Decisions and blockers

Missing visual/browser tools require an explicit unverified scope. Resolve contradictory behavior through requirements; do not silently alter external prototypes.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use the registered prototype entry (new HTML: prototype/index.html). Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

## Human document review

Apply [document review](../document-review.md): generate → self-check → present the concrete document entry, current review status and focus → wait. Record explicit user approval of this version/content, then follow the core session interaction: stop at this stage boundary and suggest a new session; continue here when requested. Approval and continuation may be expressed together. Questions or edit requests retain the stop; edits require self-check and re-review. Production `done` is separate from approval and final acceptance.
