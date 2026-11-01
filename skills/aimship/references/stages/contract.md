# Define interfaces and independent SQL

## Inputs

Read the current requirements, technical design and existing engineering contracts.

## Goal and scope

Make applicable interface and database changes unambiguous after the technical design, without inventing an interface for SQL-only work.

## Actions

Update/reuse the authoritative HTTP OpenAPI when applicable; create a delivery-local OpenAPI only if the engineering authority is absent. Specify operations, schemas, errors, compatibility and consumer expectations. Use appropriate formats for messages/non-HTTP interfaces. Link design and test requirements.

A breaking interface/compatibility decision needs its proper authority. Missing consumers or schemas remain stated gaps, not fabricated agreements.

## Outputs and result

Use openapi.yaml or the registered authoritative contract when interfaces apply. Database changes produce independent database.sql for one target, or database-<id>.sql per target, with target/dialect/version/schema basis/conditions and ordered requirement/design references. Review each file individually after technical design approval and before test cases. Do not execute SQL or modify engineering migrations without explicit authorization.

## Completion and stop

The cooperating parties have an unambiguous applicable contract consistent with the current requirements/design. Select this responsibility for interface or database changes; omit it only when neither applies. SQL-only work does not invent an interface artifact.

Self-check the selected outputs and stop for their [current-content review](../document-review.md); unchanged supplied inputs follow the shared adoption rules. Production done is separate from approval.
