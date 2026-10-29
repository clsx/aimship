# Design the implementation

## Basis

Read current requirements, relevant engineering instructions, architecture, schema and diagnosis.

## Work and result

Choose an approach with concrete components, dependencies, errors/recovery, compatibility and tradeoffs. Link authoritative contracts instead of duplicating them. For database changes design the data change and the subsequent independent SQL deliverable; explain dialect/version, existing schema basis, conditions and sequence. Do not edit migration files or execute SQL without that commission.

For applicable concurrency and state changes, explain when the business constraint is checked, what enforces it and any remaining window. Keep that guarantee distinct from excluded product interactions; if the requirements leave its meaning unresolved, ask the concrete question. For example, a stock reservation may check and decrement within one transaction; an earlier availability display alone does not guarantee stock at commit.

For a material new database/RPC call on the critical path, describe its location, repeat calls within a request, timeout/failure behavior, cost basis and how feasibility will be checked. Distinguish observed facts, estimates and unknowns; verification should match the actual risk, without invented capacity targets.

Use an ordered explanation for simple flows. Where cross-system calls are hard to follow, a concise architecture or sequence diagram can show transaction boundaries and cache/response order. Explain affected frontend component reuse and state/data flow. Detail the actual tradeoffs; API schemas, executable SQL and full test cases remain in their later deliverables.

## Continue when

The design can guide the agreed next work and correctness-affecting issues have a clear disposition. Explain the approach and outstanding choices to the user.

## Decisions and blockers

Missing schema/dialect or material compatibility/data decisions block dependent design claims. An explicitly revised conceptual-design endpoint must retain these limitations.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use tech-design.md. Preserve the ordinary template headings and section order. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

Technical design does not require finished SQL before its review. After its approval, contract produces and presents database.sql for one target, or database-<id>.sql per independent target. No SQL for no database change.

## Human document review

Apply [document review](../document-review.md): generate → self-check → present the concrete document entry, current review status and focus → wait. Record explicit user approval of this version/content, then follow the core session interaction: stop at this stage boundary and suggest a new session; continue here when requested. Approval and continuation may be expressed together. Questions or edit requests retain the stop; edits require self-check and re-review. Production `done` is separate from approval and final acceptance.
