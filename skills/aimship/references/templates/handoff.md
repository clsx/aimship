# handoff

Delivery: <deliveryId from init>; document revision: <revision>.

Basis: identify the authoritative inputs and versions. Summary: state the effective proposal or the object reviewed/executed, without a second progress ledger.

Replace guidance with actual content. Retain every section; state the concrete reason for inapplicability. An unknown applicable detail is a gap with impact and a resolution point, never “not applicable”.

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

Table: REQ/AC | Actual deliverable | Verification reference | Gap. Include explicitly changed goals and their basis; no completion claim from file presence.

## 2. Artifacts, repositories and versions

### 2.1 Artifacts and code

Table: Artifact/repository | Path/entry | Actual checkout/worktree | Branch/commit or file digest | Uncommitted paths | Build/version | Integration state. Link authoritative artifacts rather than copy design.

## 3. Configuration and dependencies

### 3.1 Configuration

Table: Name | Value source (no secrets) | Purpose | Applicable environment | Required order/preconditions.

### 3.2 Dependencies

List service/data/permission/runtime dependencies, available versions and missing conditions.

## 4. SQL and execution facts

### 4.1 SQL status

Table: Target/dialect | File/version | Prepared/reviewed/trial/production execution facts separately | Environment | Evidence | Remaining action. No SQL change: state why.

### 4.2 Execution and recovery boundary

State actual prechecks, authorized execution extent and rollback/irreversible conditions. Supplying or reviewing SQL is not execution.

## 5. Usage and continuation

### 5.1 Usage

Ordered steps: Prerequisite | Working directory/entry | Action/command | Expected result | Failure recovery. Use actual commands, not guessed paths.

### 5.2 Continuation

For incomplete work name current object, remaining task/condition, relevant documents and next authorized action. No final-endpoint next-session prompt is required.

## 6. Review and verification

### 6.1 Review and verification evidence

Reference actual REV/RUN, object/version, coverage and result. Distinguish local checks, formal verification and unverified conditions; do not duplicate current result ledgers.

## 7. Limitations and remaining work

### 7.1 Limits and remaining work

Item | Affected behavior/AC | Accepted or unresolved with decision basis | Recovery/resolution condition | Next action. Required blocked verification remains incomplete acceptance.

## 8. Acceptance, integration and release facts

### 8.1 Independent outcome facts

Record goal achievement, user acceptance, integration/merge and release/deployment separately, each with actual evidence/date/object or explicit not-performed scope. Prepared is not released; branch completion is not merge. Do not add an uncommissioned deployment stage.
