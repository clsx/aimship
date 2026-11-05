# Design the implementation

## Inputs

Read current requirements, the relevant implementation/interfaces/schema, applicable engineering instructions and any commissioned diagnosis. Apply the [shared project context and decisions](../core.md#project-context-and-decisions).

## Goal and scope

Explain an implementation-ready engineering approach for the approved requirement scope, with readable decisions and dependencies.

## Actions

Choose an approach grounded in the relevant current implementation and applicable conventions, explaining reuse and necessary differences without expanding into unrelated legacy cleanup. Describe concrete components, dependencies, errors/recovery, compatibility and tradeoffs. Link authoritative contracts instead of duplicating them. For database changes design the data change and the subsequent independent SQL deliverable; explain dialect/version, existing schema basis, conditions and sequence. Do not edit migration files or execute SQL without that commission.

For applicable concurrency and state changes, explain when the business constraint is checked, what enforces it and any remaining window. Keep that guarantee distinct from excluded product interactions; if the requirements leave its meaning unresolved, include the concrete question in the document with its impact, recommendation and the work that needs an answer. For example, a stock reservation may check and decrement within one transaction; an earlier availability display alone does not guarantee stock at commit.

For a material new database/RPC call on the critical path, describe its location, repeat calls within a request, timeout/failure behavior, cost basis and how feasibility will be checked. Distinguish observed facts, estimates and unknowns; verification should match the actual risk, without invented capacity targets.

Use the ten-chapter [technical design template](../templates/tech-design.md) in its fixed order, including its numbered subtopics. Build the operation inventory first, then account for every operation in chain diagrams, class/module inventories, data relationships, frontend behavior and interface references. Each distinct backend call order/transaction boundary needs a sequenceDiagram. Class-language backend logic changes require classDiagram for all new/changed business handlers and directly used collaborators; non-class languages use actual module/function dependencies. Relational access requires erDiagram even for reused tables with no DDL. Keep field, method, index, state and consistency tables at the specified granularity. Frontend changes need route/component/state/operation details and their component relationships. Apply factual exceptions from the template, not “simple” or “core objects”.

Self-check inventory coverage against every diagram/table and cross-document symbol. Keep current design readable without investigation logs. Complete wire contracts, executable SQL and full test cases remain in their later deliverables. For revisions apply [in-place revision rules](../document-revisions.md), preserving visible risks and questions.

Investigate available schema/dialect facts directly. Missing correctness-affecting facts or material compatibility/data decisions hold the dependent design claims; nonblocking execution details may stay explicit for later work. An explicitly revised conceptual-design endpoint must retain these limitations.

## Outputs and result

Use tech-design.md.

Technical design does not require finished SQL before its review. After its approval, contract produces and presents database.sql for one target, or database-<id>.sql per independent target. No SQL for no database change.

## Completion and stop

The design can guide the agreed next work and correctness-affecting issues have a clear disposition. Explain the approach and outstanding choices to the user.

Self-check the selected outputs and stop for their [current-content review](../document-review.md); unchanged supplied inputs follow the shared adoption rules. Production done is separate from approval.
