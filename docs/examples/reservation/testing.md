# Reservation example: testing

Delivery: synthetic-reservation; document revision: 1. Basis: the [example commission](README.md). Hand-authored design example; no application implementation, user approval or execution is claimed.

Four cases define required combinations and assertions. All application execution remains not run.

**Contents**

- [1. Basis and scope](#1-basis-and-scope)
- [2. Environment, data and execution conditions](#2-environment-data-and-execution-conditions)
- [3. Case index and details](#3-case-index-and-details)
- [4. Coverage and verification arrangement](#4-coverage-and-verification-arrangement)
- [5. Formal verification and execution records](#5-formal-verification-and-execution-records)
- [6. Defects and unfinished work](#6-defects-and-unfinished-work)

## 1. Basis and scope

### 1.1 Basis and scope

PRD/design/OpenAPI/RPC/SQL revision 1; AC-001 through AC-004. This example defines cases; no application code or service has been executed.

### 1.2 Verification choices

Repository/service assertions check idempotency/transactions; provider/consumer integration checks notice semantics; component assertions check states; live browser/service assertions check actual integration. No throughput target. Mock checks cannot prove SQL constraints or consumer dedup.


## 2. Environment, data and execution conditions

### 2.1 Environment and tools

| Service/client | Version/entry | Tool | Conditions | Availability |
| --- | --- | --- | --- | --- |
| main database | PostgreSQL 15 declared; endpoint unresolved | SQL client + service integration runner | Isolated DB, approved script execution | Not provisioned |
| hold-service | Kotlin fixture-v1; command unresolved until repo exists | Existing project test runner to be inspected | Eligibility stub and real consumer test endpoint | Not implemented |
| hold-web | React fixture-v1; /holds/new | Project component/browser runner to be inspected | Local app and authenticated member data | Not implemented |

### 2.2 Data matrix

| Label | Input/pre-state | Construct/reset | Required use |
| --- | --- | --- | --- |
| valid-A | Tenant A/member A, eligible, item BOOK-1, UUID key K | Insert isolated member; delete event then hold after test | First create; sequential retry; concurrent retry |
| invalid-code | Empty, 33 characters, or whitespace item | No hold/event | Each of these 3 variants in TC-002 |
| denied | No session; missing tenant member; ineligible | Separate fixture per variant | Each of these 3 variants in TC-002 |
| conflict | K already bound to another item or another member | Seed valid original hold/event | Both variants; do not disclose original owner |
| unavailable | Eligibility RPC timeout; DB outbox insert failure | Fault injection cleared after test | Both variants; assert no partial records |
| event-fault | Ack success; publish timeout; crash after consumer persist before markSent | One pending event each; clear consumer dedup store between variants | All 3 variants in TC-003 |
| form-state | invalid input; pending; lost response; definite error; reset; leave/return with late response | Fresh browser session except retained-attempt case | All 6 variants in TC-004 |

Required combinations are the rows/variants above, not a Cartesian product. TC-001 additionally uses three exact submit schedules: first only, sequential repeat, two simultaneous same-key requests. Every case passes only after all its listed variants pass.

### 2.3 Preparation gaps

All live endpoints and project commands remain unavailable in this design example. They block formal execution of every TC; test intent and exact assertions remain defined below.


## 3. Case index and details

### 3.1 Case index

| TC reference | Scenario | Coverage | Method | Detail |
| --- | --- | --- | --- | --- |
| TC-001 | Atomic create/replay | AC-001 | DB/service integration | 3.2.1 |
| TC-002 | Invalid/denied/failure | AC-002 | HTTP/service/DB integration | 3.2.2 |
| TC-003 | Notice retries | AC-003 | Dispatcher/consumer integration | 3.2.3 |
| TC-004 | Form states | AC-004 | Component + live browser | 3.2.4 |

### 3.2 Case details

### 3.2.1 TC-001 — Atomic create and replay

Objective: AC-001 for REQ-001. Use valid-A for each of the three schedules in 2.2; reset between schedules.

1. Submit BOOK-1/K as the trusted member; expect 201 with UUID hold ID and ACTIVE.
2. For sequential/concurrent schedules repeat the identical request; expect the same ID, with one 201 and remaining 200 responses. For concurrent scheduling synchronize both before insert; do not merely send serial requests.
3. Query main.hold by tenant/key; expect exactly one row, correct member/item and ACTIVE. Query notice_outbox by hold ID; expect exactly one PENDING event.
4. Capture request/response bodies without session credentials, schedule synchronization evidence and DB row counts. Service/DB assertions own atomicity; a UI toast alone cannot satisfy this case.

Entry: project integration runner once implemented; record its actual command/version in RUN. Until then this case is not run.

### 3.2.2 TC-002 — Rejections and rollback

Objective: AC-002, PERM-001 and EC-001 for REQ-001. Execute all 10 variants: 3 invalid-code, 3 denied, 2 conflict and 2 unavailable. Seed/reset each independently.

1. Record original row counts and original hold values for conflict variants.
2. Submit the variant. Expect 400 for invalid-code; 401 for no session; 403 for absent member/ineligible; 409 for both conflicts; 503 for RPC timeout/outbox insert failure.
3. Assert error code/body matches OpenAPI, contains no foreign member or hold details, and creates no additional hold/event. For outbox failure assert the hold insert rolled back; for conflicts assert original values unchanged.
4. Clear faults and capture HTTP and DB evidence. The injected failure must be observed at the intended boundary; an unrelated connection failure does not prove rollback.

Entry: service integration runner plus SQL assertions; no real execution recorded.

### 3.2.3 TC-003 — At-least-once notice with consumer deduplication

Objective: AC-003 for REQ-002. Execute all three event-fault variants using one committed event each.

1. Run one dispatcher tick; consumer receives exactly the committed event ID and hold payload. Never publish an uncommitted or rolled-back event.
2. Ack-success: assert event SENT. Timeout: assert PENDING; restore publisher and tick again. Crash-after-consumer-write: leave PENDING, restart dispatcher and tick again.
3. For both retried variants assert identical event ID on every delivery, one consumer notice row and eventual SENT after ack. Do not call the transport exactly-once.
4. Retain dispatcher attempt IDs, consumer dedup assertion and DB state; a publisher mock alone does not satisfy the consumer guarantee.

Entry: integration runner with fault controls and consumer test environment. Environment missing means blocked, not passed.

### 3.2.4 TC-004 — Draft, uncertain result and stale response

Objective: AC-004 for REQ-003 and EC-001. Execute all six form-state variants; component controls may prove state transitions, but use a live endpoint for timeout-after-commit recovery.

1. Invalid input: type whitespace; submit remains blocked and field error is shown; no request is sent.
2. Pending: delay response; submit/reset disabled and one request sent despite repeated clicks.
3. Lost response after actual commit: show uncertain state; retry sends identical key/item; server returns original hold, then confirmation shows ID/ACTIVE and saved attempt clears.
4. Definite error: display returned error; preserve input and allow correction; new submission uses a fresh attempt only after definite no-write outcome.
5. Reset while idle: clear draft/key locally with no API call. Reset remains disabled during pending/uncertain.
6. Leave/return while pending: warning and saved attempt remain; returning offers retry, never auto-submit. Deliver the old response after remount; assert it cannot replace the active page state.

Record browser steps/screenshots, outgoing key/payload comparisons and service/DB evidence for step 3. Assertion locations are UI controls/state, HTTP traffic and stored hold/event. No execution is claimed.


## 4. Coverage and verification arrangement

### 4.1 Coverage index

| AC/rule | TC | Interface/page branches |
| --- | --- | --- |
| AC-001, REQ-001 | TC-001 | createHold 201/200; concurrency |
| AC-002, PERM-001, EC-001 | TC-002 | createHold 400/401/403/409/503; rollback |
| AC-003, REQ-002 | TC-003 | Publish ack/timeout/crash/dedup |
| AC-004, REQ-003 | TC-004 | Form validate/pending/uncertain/definite error/reset/navigation |

### 4.2 Execution arrangement

After overall review, prepare isolated data/consumer, execute service cases, then live form path with the same assertion helpers. Record each required variant explicitly. Capacity/backlog measurement is a remaining risk observation, not a fabricated functional SLA.


## 5. Formal verification and execution records

### 5.1 Current verification (generated)

Pending state generation.

### 5.2 Formal runs and retests

No RUN exists: this is a designed case set without an application/environment. A future RUN must name case revision, exact code/build, environment, every variant, steps, observed assertions and evidence. A partially executed case must not be submitted as passed coverage.


## 6. Defects and unfinished work

### 6.1 Defects and disposition

No application defect result is claimed. Test design risks and missing dependencies are stated above; they are not passing RUNs.

### 6.2 Unfinished verification

All TC combinations remain unexecuted. Provision and authorize the environment, replace unresolved runner entries with actual inspected commands, implement/review the objects, then execute. Do not remove unavailable cases.

