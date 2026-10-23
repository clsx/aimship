# Design the implementation

## Basis

Read current requirements/Scope, relevant engineering instructions, architecture, schema and diagnosis.

## Work and result

Choose an approach with concrete components, dependencies, errors/recovery, compatibility and tradeoffs. Link authoritative contracts instead of duplicating them. For database changes create separate delivery-local SQL and explain dialect/version, existing schema basis, conditions and sequence. Do not edit migration files or execute SQL without that commission.

## Continue when

The design can guide the agreed next work and correctness-affecting issues have a clear disposition. Explain the approach and outstanding choices to the user.

## Decisions and blockers

Missing schema/dialect or material compatibility/data decisions block dependent design claims. An explicitly revised conceptual-design endpoint must retain these limitations.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use tech-design.md. Preserve the `coverage` section anchor. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

Produce database.sql for one target, or database-<id>.sql per independent target, before completing this stage. No SQL for no database change.
