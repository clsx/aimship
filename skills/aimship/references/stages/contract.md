# Define interfaces and independent SQL

## Basis

Read the current requirements, technical design and existing engineering contracts.

## Work and result

Update/reuse the authoritative HTTP OpenAPI when applicable; create a delivery-local OpenAPI only if the engineering authority is absent. Specify operations, schemas, errors, compatibility and consumer expectations. Use appropriate formats for messages/non-HTTP interfaces. Link design and test requirements.

## Continue when

The cooperating parties have an unambiguous applicable contract consistent with the current requirements/design. Select this responsibility for interface or database changes; omit it only when neither applies. SQL-only work does not invent an interface artifact.

## Decisions and blockers

A breaking interface/compatibility decision needs its proper authority. Missing consumers or schemas remain stated gaps, not fabricated agreements.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use openapi.yaml or the registered authoritative contract when interfaces apply. Database changes produce independent database.sql for one target, or database-<id>.sql per target, with target/dialect/version/schema basis/conditions and ordered requirement/design references. Review each file individually after technical design approval and before test cases. Do not execute SQL or modify engineering migrations without explicit authorization. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

## Human document review

Apply [document review](../document-review.md): generate → self-check → present the concrete document entry, current review status and focus → wait. Record explicit user approval of this version/content, then follow the core session interaction: continue within the group, or suggest a new session at its boundary; continue here if requested. Questions or edit requests retain the stop; edits require self-check and re-review. Production `done` is separate from approval and final acceptance.
