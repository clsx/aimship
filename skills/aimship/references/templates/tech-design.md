# tech-design

Delivery: <deliveryId from init>; document revision: <revision>.

Basis: identify the authoritative inputs and versions. Summary: state the effective proposal or the object reviewed/executed, without a second progress ledger.

Replace guidance with actual content. Retain every section; state the concrete reason for inapplicability. An unknown applicable detail is a gap with impact and a resolution point, never “not applicable”.

**Contents**

- [1. Summary and design basis](#1-summary-and-design-basis)
- [2. System architecture and connections](#2-system-architecture-and-connections)
- [3. Operations and processing flows](#3-operations-and-processing-flows)
- [4. Backend modules and classes](#4-backend-modules-and-classes)
- [5. Data model and consistency](#5-data-model-and-consistency)
- [6. Frontend design](#6-frontend-design)
- [7. Interface overview](#7-interface-overview)
- [8. Permissions, performance and recovery](#8-permissions-performance-and-recovery)
- [9. Migration, tradeoffs and risks](#9-migration-tradeoffs-and-risks)
- [10. Requirement coverage and questions](#10-requirement-coverage-and-questions)

## 1. Summary and design basis

### 1.1 Goal and proposal

State the requested behavior, chosen implementation and observable outcome in a short paragraph.

### 1.2 Requirement and engineering basis

List PRD/AC, repository IDs, paths, baseline/version, applicable engineering rules, observed schema/interface facts and reading limits. Separate observed facts from proposals.

### 1.3 Changes and review focus

List the changed boundaries and decisions the reader must assess, including unresolved correctness-affecting questions.

## 2. System architecture and connections

### 2.1 Repository and module boundaries

Table: Repository/module | Responsibility | Owned data | Caller/callee | New/changed/reused | Source path.

### 2.2 Architecture diagram

Provide a Mermaid flowchart showing the modules in 2.1, clients, storage and actual external boundaries. Label calls and data ownership; do not show a remote database as locally writable.

### 2.3 Connections and dependencies

Table: Caller | Provider | Protocol/destination | Authentication/context source | Sync/async | Configuration source | Failure dependency. Identify the actual engineering convention and versions.

## 3. Operations and processing flows

### 3.1 Operation inventory

One row for EVERY new/changed HTTP or RPC method, message consumer, scheduled job and frontend business operation: Operation | Trigger/entry | REQ/AC | Processing module | Read/write objects | Return/side effect | Chain or frontend-detail reference.

### 3.2 Chain index

Group operations ONLY when backend call order AND transaction boundary match. List all entries and differences. Query, save, preview and confirm cannot share a diagram merely because they belong to one page. Local frontend operations point to chapter 6.

### 3.3 Processing chain details

Repeat one numbered subsection per backend chain. Each MUST include a Mermaid sequenceDiagram covering actual participants, call order, checks/branches, database reads/writes, transaction begin/commit/rollback where used, external calls and failure returns. Show async emission before/after commit and accepted versus completed. Follow the diagram with branch conditions and the data state after failure. Do not invent participants or transactions.

## 4. Backend modules and classes

### 4.1 Modules and locations

Table: Repository | Module/package | Actual path | Responsibility | New/changed/reused | Operation references.

### 4.2 Class inventory

Include ALL proposed new/changed business handling classes on the chains and their directly used existing business collaborators, persistence interfaces and external service interfaces. Table: Repository | Package/path | Class/interface | New/changed/reused | Responsibility | Participating methods | Dependencies | REQ/AC. Mark proposed names; give source evidence for existing names.

### 4.3 Class diagrams by module

For backend logic changes implemented with classes/interfaces, provide Mermaid classDiagram covering the inventory, involved domain objects, repositories/Mappers and external interfaces. Show participating methods and actual calls, inheritance, realization and composition. Reused classes expose only used methods. Reference DTO types without duplicating contract field definitions. Do not expand framework internals, unchanged utility libraries or generated accessors.

For non-class languages, use the actual module/function inventory and Mermaid dependency diagram, with inputs, outputs and side effects mapped to the same operations. Text/style/SQL-only changes without backend logic explicitly state that fact instead of inventing classes. Scope is determined by changed objects and language, never “core” or perceived simplicity.

### 4.4 Method responsibilities

For each participating method/function: qualified symbol | Parameters/types | Result/type | Validation | Reads/writes | Calls and responsibility | Error behavior. Keep internal implementation responsibilities here and wire-field definitions in the contract.

## 5. Data model and consistency

### 5.1 Tables and data grain

Inventory EVERY relational table actually read/written by the chains, including reused tables with no DDL and index-only targets: Database | Table | New/changed/reused | What one row represents | Creation/update trigger | Readers/writers | REQ/AC.

### 5.2 Entity relationships

Relational access or schema changes REQUIRE Mermaid erDiagram covering the inventory, PKs, relationship fields, cardinality and nullability. Identify database boundaries and actual FK versus logical association. A single unrelated table may stand alone. Do not invent FK constraints or cross-database joins. For nonrelational storage use actual key/document structure and relationship diagrams; if no persistence is used, state why.

### 5.3 Fields

One row per field: Table | Field | Type/length | Nullable/default | Meaning/unit | Source/generation | Constraints | New/changed/reused. Cover every field of new tables; for existing tables cover changed fields and fields used in this feature, identifying that scope. Keep stored data separate from DTO fields.

### 5.4 Indexes and access

Table: Database/table | Query/filter/sort/join | Existing/new index and column order | Uniqueness | Cost/selectivity basis | Missing evidence. Explain affected access paths; do not assume an index guarantees every query.

### 5.5 States and transitions

For persistent business lifecycle changes, give a state table and Mermaid stateDiagram-v2: Object | From | Trigger/guard | To | Data/side effects | Prohibited transitions. Distinguish frontend drafts from persistent state. With no lifecycle, state the actual data behavior.

### 5.6 Transactions and concurrency

For EACH cross-record or concurrent invariant: Constraint | Check time | Enforcing boundary/locking/version/unique key | Transaction reads/writes | External call timing | Retry/idempotency | Remaining window and consequence. Explain rollback and partial failure. An earlier read does not guarantee the later commit.

### 5.7 SQL delivery plan

List target IDs, dialect/version/schema evidence, planned DDL/index/configuration DML, ordering, prechecks and code/cache coordination. After design approval, contract produces one database.sql or database-<id>.sql per target. Design is not executable SQL or execution permission. No structure/data change means no SQL deliverable; reused data still needs 5.1–5.6.

## 6. Frontend design

### 6.1 Pages, routes and entry points

Table: Page/route | Repository/file | Entry | Roles | REQ/AC | New/changed/reused. No UI change: retain this chapter with the concrete scope reason.

### 6.2 Components and relationships

Inventory new/changed components and directly reused components: Name/path | Responsibility | Inputs/outputs/events | New/changed/reused | Parent/child. Include a Mermaid component dependency flowchart matching this inventory.

### 6.3 State and data flow

For each page/component: State | Owner | Initial/source value | Read/write operations | Derived/shared state | Persistence | Reset/cleanup. Show the flow from response to local state and submit payload; identify draft versus saved values and old async response handling.

### 6.4 Operations, validation and recovery

One detail per operation in 3.1: trigger/precondition, validation, API/chain, pending/disabled behavior, success, error, cancellation/navigation, retry and stale-result handling. Include empty/loading/forbidden states. Reference the contract for wire fields.

## 7. Interface overview

### 7.1 HTTP operations

Table: operationId | Method/path | Purpose | Caller/provider | Auth/scope | Main input/output types | Contract location | Operation reference. No invented interface for local-only work.

### 7.2 RPC, messages and other protocols

List methods/events, callers/producers, providers/consumers, destination, sync/async and side effects. Link the relevant non-HTTP contract.

### 7.3 Contract ownership and production

Identify the authoritative existing or planned file per interface. Link complete request/response/error definitions there; no duplicated wire schema here. Mark any unresolved compatibility agreement.

## 8. Permissions, performance and recovery

### 8.1 Identity and data permissions

Table: Operation | Trusted identity/context source | Object/tenant scope | Enforcement location | Denied result | Data left unchanged. Client claims are not a trusted source without validation.

### 8.2 Call cost and performance

For changed database/RPC calls: placement | Calls per request/batch | Repeated work | Timeout/configuration source | Observed/estimated/unknown cost basis | Verification method. Do not invent capacity or latency targets.

### 8.3 Cache and messages

For used caches/messages: ownership/key or destination, update/invalidation or emission timing, ordering, duplicates, loss/failure and recovery. State factual absence if neither is used.

### 8.4 Errors, timeout and recovery

Table: Trigger | Error/visible result | Persisted state and side effects | Retry/compensation | Responsible component | Contract reference. Show partial failure, not merely a generic error handler.

### 8.5 Observability

Specify event/log/metric fields, correlation identifiers, observation point and sensitive-data restrictions for diagnosing the designed failures; use project conventions.

## 9. Migration, tradeoffs and risks

### 9.1 Migration and rollback

Give ordered data/code/config switch steps, compatibility overlap, preconditions and rollback or irreversible effects. Distinguish design, supplied scripts and actual execution.

### 9.2 Technical choices

For material choices: alternatives | Chosen approach | Engineering/requirement basis | Consequence. Do not accumulate withdrawn proposals in current design.

### 9.3 Remaining risks

Risk | Affected operations/AC | Mitigation | Accepted/unresolved with actual basis | Owner/action and latest resolution point. Accepted risk remains visible.

## 10. Requirement coverage and questions

### 10.1 Requirement and acceptance coverage

Table: REQ/AC | Operation | Class/module | Data | Frontend | Contract/SQL | Design section. Cite definitions rather than redefine IDs. Explain absent dimensions.

### 10.2 Questions and gaps

Q ID | Missing fact/decision | Impact/dependent work | Recommendation | Latest point needing resolution | Actual decision/source. Unknown is not inapplicable.
