# Detailed reservation design example

This is a **hand-authored synthetic design set**, not a runnable application, an actual user commission or a recorded user approval. It demonstrates the document specification with concrete paths, fields, methods, diagrams, failure branches, tasks and assertions. The declared Kotlin/React/PostgreSQL baseline is fictional. Replace such assumptions with actual engineering evidence in a real delivery.

The example commission is: let an authenticated member create a hold, safely retry an uncertain submission, and receive a notice through a recoverable dispatcher. The design endpoint is documentation and cases; no application implementation, execution, acceptance or release is claimed.

Read in this order:

1. [PRD](prd.md): business objects, rules, interaction and acceptance.
2. [Technical design](tech-design.md): ten chapters, two processing sequences, class/ER/state/component diagrams and inventories.
3. [OpenAPI](openapi.yaml), [RPC/message contract](rpc.md) and [independent SQL](database.sql): authoritative wire fields and database script.
4. [Test cases](testing.md): short index, unique TC details, explicit input combinations and assertion layers.
5. [Plan](plan.md): two batches, concrete objects and completion criteria.
6. [Review boundary](review.md), [handoff facts](handoff.md) and [change history boundary](change-log.md): honest statements of unperformed work.

The pending generated sections are intentionally unpopulated because this static example has no delivery state. Scripted state tests separately verify generated summaries and approvals; they are not application execution evidence. See [boundary examples](../boundaries.md) for SQL-only, no-frontend and non-class-language work, and [Contributing](../../../CONTRIBUTING.md#document-specification-checks) for validation limits.
