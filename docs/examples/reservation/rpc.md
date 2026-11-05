# Eligibility RPC and hold-created notice contract

Delivery: synthetic-reservation; document revision: 1. Basis: [PRD](prd.md) and [design](tech-design.md). Fictional provider/consumer agreement; no live service inspected.

**Contents**

- [1. Scope and parties](#1-scope-and-parties)
- [2. Operation and message inventory](#2-operation-and-message-inventory)
- [3. Signatures and structures](#3-signatures-and-structures)
- [4. Field definitions](#4-field-definitions)
- [5. Errors and side effects](#5-errors-and-side-effects)
- [6. Calls, retries and duplicates](#6-calls-retries-and-duplicates)
- [7. Compatibility and integration order](#7-compatibility-and-integration-order)

## 1. Scope and parties

HoldService consumes Eligibility.check from the read-only eligibility provider. NoticeDispatcher produces notice.hold-created for the notice consumer. The synthetic baseline uses JSON over an authenticated internal RPC transport and JSON messages over an acknowledged bus. Real transport/version and credential configuration are unresolved engineering prerequisites; this document does not claim an implementation-ready agreement for a real service. Tenant/member originate from verified server context, not request body. Credentials come from deployment configuration and are never logged.

## 2. Operation and message inventory

| Name | Parties | Trigger | Mode | Requirement |
| --- | --- | --- | --- | --- |
| Eligibility.check | HoldService → eligibility | New key, before local transaction | Synchronous read | REQ-001 |
| notice.hold-created | NoticeDispatcher → notice consumer | Committed pending event | Asynchronous business work, publish acknowledgement | REQ-002 |

## 3. Signatures and structures

Eligibility.check(EligibilityRequest) returns EligibilityResult. An eligible reply permits a subsequent local create; it does not reserve eligibility until commit. Unavailable transport maps to the HTTP dependency error, never to an empty eligible response.

NoticeMessage contains eventId, type, tenantId, memberId, holdId, itemCode and createdAt. Dispatcher joins the immutable hold to the outbox row. The event is inserted with the hold before commit and is published only after commit. Ack means the consumer's deduplicated notice record has been durably accepted in this synthetic agreement, not that a person read it.

## 4. Field definitions

| Type.field | Type/format | Required/null/default | Bounds/meaning/source | Compatibility |
| --- | --- | --- | --- | --- |
| EligibilityRequest.tenantId | string UUID | Yes/no/none | Trusted tenant | Required v1 |
| EligibilityRequest.memberId | string UUID | Yes/no/none | Trusted member | Required v1 |
| EligibilityResult.eligible | boolean | Yes/no/none | Eligibility at check time | Required v1 |
| NoticeMessage.eventId | string UUID | Yes/no/none | Immutable outbox ID; dedup key | Required v1 |
| NoticeMessage.type | string | Yes/no/none | Exactly hold-created.v1 | Required v1 |
| NoticeMessage.tenantId | string UUID | Yes/no/none | Stored hold tenant | Required v1 |
| NoticeMessage.memberId | string UUID | Yes/no/none | Stored member | Required v1 |
| NoticeMessage.holdId | string UUID | Yes/no/none | Stored hold identity | Required v1 |
| NoticeMessage.itemCode | string | Yes/no/none | 1–32, ASCII alphanumeric/hyphen | Required v1 |
| NoticeMessage.createdAt | string date-time | Yes/no/none | Hold creation instant, UTC | Required v1 |

No field accepts null or an implicit default. No collection/empty-list branch exists. Unknown additional event fields may be ignored; required field removal/type/meaning changes require a new event version.

Eligible example: request tenantId `00000000-0000-4000-8000-000000000001`, memberId `00000000-0000-4000-8000-000000000002` → `{"eligible":true}`. Denied example: same shape → `{"eligible":false}`. Unavailable example: transport deadline expires with no result; caller performs no writes.

Notice example:

```json
{"eventId":"00000000-0000-4000-8000-000000000003","type":"hold-created.v1","tenantId":"00000000-0000-4000-8000-000000000001","memberId":"00000000-0000-4000-8000-000000000002","holdId":"00000000-0000-4000-8000-000000000004","itemCode":"BOOK-1","createdAt":"2026-01-01T00:00:00Z"}
```

## 5. Errors and side effects

| Trigger | Result | Persisted effect | Recovery |
| --- | --- | --- | --- |
| Eligibility denied | eligible=false, HTTP 403 | No new local hold/event | Correct eligibility |
| Eligibility timeout/unavailable | RPC unavailable, HTTP 503 | No local transaction begun | Retry same key |
| Invalid event fields | Consumer rejects, no ack | Sender remains PENDING | Repair producer against contract; do not mark sent |
| Publish/ack loss | Outcome unknown | Consumer may already have notice; local PENDING | Republish same eventId |
| Consumer duplicate eventId | Ack prior result | No second notice | Sender may mark SENT |
| markSent storage failure | Internal failure | Consumer notice exists; sender PENDING | Republish/dedup next tick |

Acceptance examples: publishing the example event twice leaves exactly one consumer notice row; first ack lost then second ack succeeds leaves sender SENT. These are required behaviors, not observed execution results.

## 6. Calls, retries and duplicates

Eligibility timeout is a proposed 800 ms fixture setting; no automatic nested retries inside one create. The user can retry the same key. Publisher timeout is 1000 ms; dispatcher polls every 5000 ms and selects up to 50 pending events. These are choices, not measured latency guarantees. Retry ownership stays with the dispatcher, preserving eventId indefinitely while pending; there is no claimed maximum delivery time or dead-letter implementation in this scope.

Consumer uniqueness on eventId prevents duplicate notice creation. Two dispatchers may publish the same event. No ordering guarantee exists between holds. The idempotency requirement is durable for the retained event history; retention/purge is outside this scope and must not be introduced without revisiting duplicates.

## 7. Compatibility and integration order

Confirm actual eligibility transport/context and consumer dedup/ack semantics before claiming real readiness. Enable schema first, then the v1 consumer, then producer/service/web, then dispatcher. A consumer lacking dedup or using ack-before-persist does not satisfy this agreement. Stop dispatcher before incompatible rollback; retain pending events. See TC-002 and TC-003 in [testing](testing.md) for failure and duplicate assertions.
