# Reservation example: handoff

Delivery: synthetic-reservation; document revision: 1. Basis: the [example commission](README.md). Hand-authored design example; no application implementation, user approval or execution is claimed.

This document states the example’s current scope and evidence limits.

**Contents**

- [1. Current goal comparison](#1-current-goal-comparison)
- [2. Artifacts, repositories and versions](#2-artifacts-repositories-and-versions)
- [3. Configuration and dependencies](#3-configuration-and-dependencies)
- [4. SQL and execution facts](#4-sql-and-execution-facts)
- [5. Usage and continuation](#5-usage-and-continuation)
- [6. Review and verification](#6-review-and-verification)
- [7. Limitations and remaining work](#7-limitations-and-remaining-work)
- [8. Acceptance, integration and release facts](#8-acceptance-integration-and-release-facts)

## 1. Current goal comparison

### 1.1 Goal comparison

| Goal | Actual artifact | Evidence/gap |
| --- | --- | --- |
| Illustrate detailed documentation | PRD/design/contracts/SQL/cases/plan | Readable design only; REQ-001 through REQ-003 are not implemented |
| Demonstrate application success | No commissioned implementation | AC-001 through AC-004 unexecuted |


## 2. Artifacts, repositories and versions

### 2.1 Artifacts and code

The files in this directory are the delivered design example, revision 1. hold-service and hold-web paths are proposed fictional locations, not real checkouts/commits. No application build or integration branch exists.


## 3. Configuration and dependencies

### 3.1 Configuration

| Name | Value source | Purpose | Environment/order |
| --- | --- | --- | --- |
| eligibility.timeoutMs | Fixture design 800 ms | Bound RPC wait | Configure before service test |
| publisher.timeoutMs | Fixture design 1000 ms | Publish ack wait | Configure before dispatcher |
| pollMs | Fixture design 5000 ms | Dispatcher interval | Enable after consumer dedup |
| API base and service credentials | Actual environment, not supplied | Connectivity/auth | No secret values in documents |

### 3.2 Dependencies

Kotlin service, React web, PostgreSQL 15, authenticated eligibility provider and deduplicating notice consumer are declared assumptions. Actual versions/commands/endpoints must be inspected before implementation.


## 4. SQL and execution facts

### 4.1 SQL status

main/PostgreSQL 15 → database.sql revision 1. Prepared as a synthetic example; no actual user approval, test execution or production execution recorded. No query result is invented.

### 4.2 Execution and recovery boundary

Before any authorized run, check target/schema/absence conditions and backup strategy. Forward DDL is transactional in this script; populated table removal loses holds/events and is not an automatic rollback.


## 5. Usage and continuation

### 5.1 Usage

Read [PRD](prd.md), then the ten-chapter [design](tech-design.md), [HTTP](openapi.yaml), [RPC/message](rpc.md), [SQL](database.sql), [cases](testing.md) and [plan](plan.md). These links are usable document entries. There is no app launch command because the application is not supplied.

### 5.2 Continuation

To implement a real derivative, first replace fixture assumptions with actual engineering evidence and obtain approval of its applicable outputs. Do not copy this example’s missing execution facts into a completed delivery.


## 6. Review and verification

### 6.1 Review and verification evidence

Application REV/RUN evidence is absent. Aimship maintainer checks of document structure/diagrams are separate and do not validate this application or establish user acceptance.


## 7. Limitations and remaining work

### 7.1 Limits and remaining work

Eligibility has a check-to-commit window; message transport is at-least-once; cleared session storage loses client retry context; backlog capacity is unmeasured. Consumer dedup evidence and actual repository/environment inspection remain necessary.


## 8. Acceptance, integration and release facts

### 8.1 Independent outcome facts

Example document authoring: supplied. Application goal: not implemented. User acceptance: not recorded. Merge/integration: not performed. Release/deployment: not commissioned or performed. No stateful handoff run is fabricated.

