# Reservation example: prd

Delivery: synthetic-reservation; document revision: 1. Basis: the [example commission](README.md). Hand-authored design example; no application implementation, user approval or execution is claimed.

This document states the example’s current scope and evidence limits.

**Contents**

- [1. Document information and sources](#1-document-information-and-sources)
- [2. Background, goals and non-goals](#2-background-goals-and-non-goals)
- [3. Roles and scope](#3-roles-and-scope)
- [4. Objects, states and business flows](#4-objects-states-and-business-flows)
- [5. Requirements and behavior](#5-requirements-and-behavior)
- [6. Pages and interaction](#6-pages-and-interaction)
- [7. Permissions, errors and quality requirements](#7-permissions-errors-and-quality-requirements)
- [8. Acceptance criteria](#8-acceptance-criteria)
- [9. Dependencies, questions and stage arrangement](#9-dependencies-questions-and-stage-arrangement)

## 1. Document information and sources

### 1.1 Identity and sources

The example commission defines a new reservation form and hold service. There is no adopted external PRD. All names and baseline facts below are synthetic; no business source has been copied.

| Source/version | Adopted content | Excluded/rewritten | Conflict/basis |
| --- | --- | --- | --- |
| Example commission v1 | Create/retry hold; dispatch notice; form behavior | No inventory allocation or persisted cancellation | No conflict in this synthetic scope |

### 1.2 Reading limits

The declared baseline is a fixture assumption, not inspected production code. A real delivery must replace it with repository/schema evidence.


## 2. Background, goals and non-goals

### 2.1 Background and goals

A member needs a confirmation that a hold request was stored even if the notice service is temporarily unavailable. Duplicate submissions must return the original hold without another notice event.

### 2.2 Non-goals

No inventory allocation, expiration, persisted cancellation, admin UI or production deployment. Eligibility is checked before first creation; it is not guaranteed to remain unchanged until or after commit.


## 3. Roles and scope

### 3.1 Roles and objects in scope

| Role | Object/data scope | Purpose | Source |
| --- | --- | --- | --- |
| Authenticated member | Own member record in authenticated tenant | Create/retry own hold | Commission v1 |
| Internal dispatcher | Pending notice events in service database | Publish committed events | Commission v1 |

### 3.2 Delivery scope and endpoint

This published example ends at documented design and cases. The illustrative implementation plan describes future local implementation/review/verification; no execution or acceptance is recorded.


## 4. Objects, states and business flows

### 4.1 Business objects

| Object | Meaning | Identity | Product fields/limits |
| --- | --- | --- | --- |
| Member | Existing tenant-scoped user | Tenant + member ID | Must exist in tenant |
| Hold | Stored member request | UUID; tenant + client key unique | Item code 1–32 ASCII letters/digits/hyphen; ACTIVE |
| Notice event | Notification work caused by a committed hold | Event UUID | PENDING/SENT; may be delivered more than once |

### 4.2 States and transitions

| Object/from | Trigger/condition | Result | Prohibited behavior |
| --- | --- | --- | --- |
| Hold/absent | Eligible first create | ACTIVE | No notice without committed hold |
| Hold/ACTIVE | Same key/member/item retry | Same ACTIVE hold | No second hold/event |
| Event/PENDING | Publish acknowledgement | SENT | Cannot claim sent on timeout |
| Event/PENDING | Publish failure/crash | PENDING, retry later | Duplicate delivery must not duplicate member notice |

### 4.3 Business flows

Member enters item → submit → server checks identity, duplicate key and eligibility → stores hold/event atomically → returns confirmation. Dispatcher later publishes pending events; acknowledgement marks sent. A failed acknowledgement can cause a duplicate with the same event ID.


## 5. Requirements and behavior

### 5.1 Functional requirements

### REQ-001 — Create and retry a hold

Actor: member. Entry: submit/retry. Preconditions: authenticated tenant/member and valid item/client key. Return the same hold for the same tenant/key/member/item; a mismatched reuse is a conflict. First creation checks eligibility before the local transaction. Success stores one hold and one notice event; denied/invalid/dependency failure leaves no new records. Source: commission v1. Acceptance: AC-001, AC-002.

### REQ-002 — Dispatch committed notices

Actor: internal scheduled dispatcher. Publish only committed pending events. Retain pending on failure; mark sent after acknowledgement. Repeated delivery has the same event ID; consumer deduplicates notice creation. No delivery deadline is promised. Source: commission v1. Acceptance: AC-003.

### REQ-003 — Preserve and reset form state

Actor: member. Enter item, submit once, observe stored confirmation or actionable error. Preserve draft/key after uncertain submission for retry. Reset before submission or after a definite rejection changes only local state. While pending/uncertain, disable reset; navigation warns that server work may complete and retains the attempt for return. Ignore old responses after page disposal. Source: commission v1. Acceptance: AC-004.

### 5.2 Shared business rules

Idempotency is defined once in REQ-001 and referenced by the form and dispatcher tests; the notice event uses its own immutable ID. Eligibility changes after its check are outside the promised guarantee, as stated in section 2.2.


## 6. Pages and interaction

### 6.1 Page inventory

| Page/client/entry | Display | Operations | Requirement | Prototype |
| --- | --- | --- | --- | --- |
| /holds/new, web, member menu | Item field, pending/error/confirmation | Submit, retry, reset draft | REQ-003 | No separate prototype commissioned |

### 6.2 Interaction details

Item is required and validated before send. Pending disables submit/reset. Timeout preserves key and payload and offers retry. Success shows hold ID/ACTIVE and clears the saved attempt. Definite invalid/forbidden/conflict errors preserve input and show their reason; edits create a fresh key only after a definite no-write response. Navigation cannot cancel committed work. Empty draft shows instructions, not an empty success result.


## 7. Permissions, errors and quality requirements

### 7.1 Permissions

### PERM-001 — Trusted member scope

Only authenticated tenant/member context selects the member. The request cannot override identity. Foreign-tenant members are rejected without writes; no session is unauthorized. Applies to REQ-001 and AC-002.

### 7.2 Exceptions and recovery

### EC-001 — Dependency and uncertain response

Eligibility unavailable returns a retryable service error before any write. Client timeout after commit is uncertain: retry the same key/payload and recover the existing hold. No second event is created. Applies to REQ-001, REQ-003, AC-002 and AC-004.

### 7.3 Quality requirements

No latency/SLA numbers are commissioned. A retry must retain idempotency across concurrent requests; a notice-service outage must not undo a stored hold. Verification observes these invariants rather than inventing throughput targets.


## 8. Acceptance criteria

### 8.1 Acceptance definitions

| AC | Requirement | Preconditions | Operation | Expected result |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Valid member/item/key | First create, sequential and concurrent same-key retries | Same hold ID; exactly one hold and event |
| AC-002 | REQ-001, PERM-001, EC-001 | Invalid, denied, conflict or eligibility-unavailable input | Submit each required combination | Defined error; no new writes; no other-tenant disclosure |
| AC-003 | REQ-002 | Committed event and controllable publisher | Ack, timeout, crash-after-publish then retry | Pending until ack; same event ID; one consumer notice |
| AC-004 | REQ-003, EC-001 | New form and delayed responses | Validate, submit, retry, reset and navigate | Correct disabled/error/confirmation state, retained uncertain attempt, no stale response overwrite |


## 9. Dependencies, questions and stage arrangement

### 9.1 Dependencies and questions

Consumer deduplication and authenticated eligibility service are declared fixture assumptions. In a real delivery their current contracts must be inspected before approving this design; absence blocks the notice/eligibility claim, not silently accepted.

### 9.2 Stage and artifact arrangement

This is a design demonstration, not a stateful completed delivery. Files illustrate PRD → design → contracts/SQL → cases → plan. Review and handoff files state unexecuted boundaries; no empty state stages, deployment stage or acceptance are fabricated.

