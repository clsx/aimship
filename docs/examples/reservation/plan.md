# Reservation example: plan

Delivery: synthetic-reservation; document revision: 1. Basis: the [example commission](README.md). Hand-authored design example; no application implementation, user approval or execution is claimed.

Two business batches separate service/data work from the form and integration. Completion conditions are prospective, not execution facts.

**Contents**

- [1. Implementation basis and scope](#1-implementation-basis-and-scope)
- [2. Batch outcomes and dependencies](#2-batch-outcomes-and-dependencies)
- [3. Tasks and completion criteria](#3-tasks-and-completion-criteria)
- [4. Review and independent verification arrangement](#4-review-and-independent-verification-arrangement)
- [5. Current execution and history](#5-current-execution-and-history)
- [6. Deviations, blockers and remaining work](#6-deviations-blockers-and-remaining-work)

## 1. Implementation basis and scope

### 1.1 Approved basis

Prospective basis: PRD/design/contracts/testing revision 1 in this example. No real approval exists. Future implementation may start only after actual current-content approval; this file does not grant it.

### 1.2 Coverage boundary

Two synthetic repositories hold-service and hold-web; main database plus eligibility/notice interfaces. No production execution, existing membership changes or persisted cancellation.


## 2. Batch outcomes and dependencies

### 2.1 Batch definitions

| B | Observable outcome | Depends on | TASKs | Coverage |
| --- | --- | --- | --- | --- |
| B-001 | Idempotent scoped create and recoverable event publishing | None | TASK-001, TASK-002, TASK-003 | REQ-001, REQ-002, AC-001, AC-002, AC-003 |
| B-002 | Member form with safe retries/navigation | B-001 | TASK-004, TASK-005 | REQ-003, AC-004 |

### 2.2 Internal and cross-repository order

For B-001, obtain real schema/contracts, review/apply SQL only in authorized test environment, implement create/repositories then dispatcher and checks. Consumer dedup availability precedes dispatcher integration. B-002: implement API adapter/form, then interaction checks using B-001 endpoint. Repairs stay attached to the same batch.


## 3. Tasks and completion criteria

### 3.1 Task definitions

| TASK | B | REQ/AC or risk | Repository | File/class/component | Concrete change | Completion criteria | Design/contract |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TASK-001 | B-001 | REQ-001, AC-001, AC-002 | hold-service | src/holds/HoldController.kt, HoldService.kt, HoldRepository.kt, Hold.kt; reused auth/TenantMember.kt and clients/EligibilityClient.kt | Identity-bound create, scoped INSERT, concurrent key replay | Same key/member/item returns one hold; denied/invalid/conflict/dependency branches match contract | Design 3.3, 4, 8; openapi.yaml |
| TASK-002 | B-001 | REQ-001, REQ-002, AC-001, AC-003 | hold-service and delivery SQL | src/holds/OutboxRepository.kt, NoticeEvent.kt; database.sql | Atomic event enqueue, pending join/markSent; create hold/outbox/indexes | No partial hold/event; one event per hold; query/constraint checks documented | Design 5; database.sql |
| TASK-003 | B-001 | REQ-002, AC-003 | hold-service | src/dispatch/NoticeDispatcher.kt; reused clients/MessagePublisher.kt; tests/HoldServiceTest.kt, DispatchTest.kt | Schedule publish, retain pending on failure, test concurrency and duplicate behavior | Same event ID reused after ack loss; consumer dedup verified when environment is available | Design 3.4, 8; rpc.md; testing cases |
| TASK-004 | B-002 | REQ-003, AC-004 | hold-web | src/holds/HoldPage.tsx, HoldForm.tsx, OutcomePanel.tsx, api.ts | Draft/attempt ownership, validation, reset/leave, typed submit/retry | Pending/uncertain state retains key; old responses ignored; UI states match cases | Design 6; openapi.yaml |
| TASK-005 | B-002 | REQ-003, AC-004 | hold-web | tests/HoldForm.test.tsx, tests/hold-flow.spec.ts | Add component checks and real-flow test entry | All required form combinations executable and isolated; mock versus integration evidence separated | Testing case and data matrix |

### 3.2 Coverage self-check

createHold and its direct classes → TASK-001; hold/event schema and repository → TASK-002; scheduled dispatch and publisher → TASK-003; every new page/component/API function → TASK-004; test-code development → TASK-003/TASK-005. No operation or changed table is omitted.


## 4. Review and independent verification arrangement

### 4.1 Review arrangement

After each implemented business batch, review its current object against the relevant tasks and design. After both close, review the combined service/web/schema/contract object overall; later repair changes require corresponding recheck and overall applicability assessment.

### 4.2 Independent verification

After overall review, run the required combinations in testing on the reviewed object. Development checks in each batch are not formal RUNs. Missing services/SQL authority keep integration cases unexecuted; do not claim a complete delivery.


## 5. Current execution and history

### 5.1 Current batch progress (generated)

Pending state generation.

### 5.2 Execution notes and history

No implementation or development checks have occurred in this design-only example. No state is registered and no execution progress is inferred.


## 6. Deviations, blockers and remaining work

### 6.1 Deviations and blockers

No execution deviation recorded. Real repository/schema/contract inspection and environment/authority are prerequisites before implementation claims.

### 6.2 Remaining actions

Obtain actual design/contract/case/plan approval and engineering evidence if this example is ever implemented. All TASK completion criteria remain above; this section does not redefine them.

