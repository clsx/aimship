# Contract and SQL detail requirements

Use after technical design approval. Reuse authoritative engineering files and conventions; no interface artifact for work without an interface change. Read [revision rules](document-revisions.md) before changing a contract. Keep implementation decisions in technical design and change history in CHG, not in a long contract preamble.

## HTTP OpenAPI

Use the adopted OpenAPI version's standard structure. Each operation defines operationId, full method/path, consumer/provider and purpose, security/data scope, parameters/body, success branches, errors, compatibility and requirement references. Each wire field states type/format/length, required versus optional, nullable behavior, default, enum/bounds and meaning/unit/source as applicable. Distinguish missing, null and empty collections. Define each distinct successful outcome and error meaning with a decidable example, including side effects and accepted versus completed where asynchronous. Reference shared schemas rather than copy competing definitions.

Check operation inventory against technical design, every request/response/error branch against field schemas and examples, and consumer expectations against those branches. Do not invent an operation, target version, timeout or compatibility guarantee that has no engineering basis. Unknown agreement details remain visible with their blocking impact. No withdrawn implementation narrative or temporary test-count history in info.description.

## RPC, messages and other contracts

Use the actual engineering format and registered contract location. Its readable specification has these seven ordered sections; retain explicit factual inapplicability within an applicable contract, but do not create empty files for unused protocols.

1. **Scope and parties:** requirements, provider/consumer or producer/consumer, ownership, actual version/baseline, serialization/transport, trusted context source and configuration source.
2. **Operation/message inventory:** method/event, purpose, destination, caller/provider, trigger, sync/async and requirement reference. One operation/event per row.
3. **Signatures and message structures:** qualified method and parameter/result types, or envelope/payload and event timing. Distinguish acceptance from completion and emission before/after commit.
4. **Field definitions:** one field per row with owning type, name, type/length, required, nullable/default, enum/bounds, meaning/unit/source and compatibility. Include context/envelope fields; do not compress ten fields into one prose cell.
5. **Errors and side effects:** trigger/code/meaning, caller-visible outcome, persisted effects, no-effect guarantees if actually enforced, and recovery. Include partial failures and unavailable consumers/providers.
6. **Calls, retries and duplicates:** actual timeout/configuration basis, retry ownership/limit, idempotency key and validity, ordering and duplicate handling, delivery semantics and failure destination where used. State unavailable evidence rather than guess runtime defaults.
7. **Compatibility and integration order:** producer/consumer change sequence, supported combinations, breaking conditions, rollout/rollback constraints and required checks.

Provide examples for distinct outcomes and reference tests for their assertions. The authoritative protocol file owns complete wire types; technical design owns participating classes, call order and persistence design.

## Independent SQL

One root-level database.sql for one target, or database-<id>.sql per independent target. Organize DDL, indexes and configuration DML by target database, not arbitrary filenames by purpose. A migration reference or code fence is not this deliverable. Preserve the existing rule that generating/reviewing SQL grants no execution or migration-file-edit permission.

Each script has these ordered, clearly labeled sections using SQL comments and actual executable statements where applicable:

1. **Target and basis:** target ID, dialect/version, observed schema/version, requirement/design references and intended change; never credentials.
2. **Prechecks:** required schema/data/configuration state, concrete read-only checks, expected results and stop conditions. State whether checks abort automatically or require an operator to stop; do not imply that comments enforce safety.
3. **Changes:** ordered DDL/index/DML, purpose and dependencies, transaction support or implicit-commit behavior, code/cache coordination and failure-stop behavior.
4. **Result checks:** exact schema/data queries and expected outcomes; a successful statement is not the whole correctness check.
5. **Partial execution and rerun:** how to identify completed steps, safe retry conditions, idempotency limits and what must be reconciled first.
6. **Rollback or irreversible effects:** prerequisites, order, data-loss implications and real restoration options. Do not invent rollback for an irreversible operation or put executable destructive rollback in the normal forward path.

Prepared, reviewed, trial-executed and production-applied are independent facts tied to file version, target/environment and evidence. Record actual execution in the appropriate RUN/handoff; never prefill it as successful. Keep schema evidence and unknown correctness-affecting conditions visible before claiming the script is ready.
