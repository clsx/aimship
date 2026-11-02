# Plan implementation batches

## Inputs

Read approved current PRD, test cases/coverage for standard delivery (or the explicit limited-scope basis), applicable design/contracts and relevant repository boundaries.

## Goal and scope

Define approved implementation batches and tasks with their boundaries, dependencies and completion criteria.

## Actions

Define executable batches, each goal and requirement coverage, dependencies, authorized file/repository scope and interfaces. Arrange batch implementation/review, overall review, then independent verification within the agreed scope; explicitly excluded testing remains an untested partial handoff. Include known cross-delivery interface, database, test-data/service and integration dependencies in this same plan, with necessary sequencing or use arrangements. Keep test-code development in appropriate batches; do not add per-batch full testing gates.

A material change in scope/endpoint needs a decision; routine task splitting does not. Record the reason if changing the existing order.

## Outputs and result

Use plan.md. Keep batch goals, dependencies and TASK definitions in the approved design sections. After approval, register stable B definitions, TASK references and dependencies through the state tool. Its finite generated execution section supplies the one current batch progress table, including implementation/review results and references. Keep detailed notes and blockers outside that generated section; do not hand-maintain another status table or redefine approved work in the execution area.

## Completion and stop

Batches can be executed in order and together cover the delivery goal. Every implementation, including a single small batch, requires a completed plan and plan.md before it begins.

Self-check the selected outputs and stop for their [current-content review](../document-review.md); unchanged supplied inputs follow the shared adoption rules. Production done is separate from approval.
