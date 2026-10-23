# Plan implementation batches

## Basis

Read current Scope, applicable design/contracts and relevant repository boundaries.

## Work and result

Define executable batches, each goal and requirement coverage, dependencies, authorized file/repository scope and interfaces. Arrange batch implementation/review, overall review, then independent verification. Include known cross-delivery interface, database, test-data/service and integration dependencies in this same plan, with necessary sequencing or use arrangements. Keep test-code development in appropriate batches; do not add per-batch full testing gates.

## Continue when

Batches can be executed in order and together cover the delivery goal. Every implementation, including a single small batch, requires a completed plan and plan.md before it begins.

## Decisions and blockers

A material change in scope/endpoint needs a decision; routine task splitting does not. Record the reason if changing the existing order.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use plan.md. Preserve the `tasks` section anchor. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.
