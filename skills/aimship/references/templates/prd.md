# prd

Delivery: <deliveryId from init>; document revision: <revision>.

Basis: identify the authoritative inputs and versions. Summary: state the effective proposal or the object reviewed/executed, without a second progress ledger.

Replace guidance with actual content. Retain every section; state the concrete reason for inapplicability. An unknown applicable detail is a gap with impact and a resolution point, never “not applicable”.

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

Identify the current authority and revision. Source table: File/version/original ID | Adopted content | Excluded/rewritten content | Conflict | Decision basis. Preserve originals; a fully adopted PRD retains its format.

### 1.2 Reading limits

State unavailable pages/assets or facts and their impact; extracted text is not interaction validation.

## 2. Background, goals and non-goals

### 2.1 Background and goals

Separate observed problem, requested outcome and assumptions. Describe observable goals.

### 2.2 Non-goals

State explicit exclusions and endpoint. An exclusion is not a guarantee about concurrent or out-of-scope actions.

## 3. Roles and scope

### 3.1 Roles and objects in scope

Table: Actor/role | Object/data scope | Allowed purpose | Source. Include single-role features.

### 3.2 Delivery scope and endpoint

Define included/excluded behavior, authorized endpoint and source correspondence. Engineering dirty-file lists belong in engineering records.

## 4. Objects, states and business flows

### 4.1 Business objects

Table: Object | Meaning | Identity | Product fields/limits. Use business meaning, not invented storage design.

### 4.2 States and transitions

Table: Object | Current state | Trigger/condition | Resulting state | Allowed/prohibited behavior. Show the business lifecycle and terminal states.

### 4.3 Business flows

List actors, ordered operations and observable results for each distinct business flow; link rules and interaction details.

## 5. Requirements and behavior

### 5.1 Functional requirements

Define each retained source ID or REQ once: Actor/object | Entry/trigger | Preconditions | Behavior | Observable result | Boundaries/errors | Source | AC. Use short index plus numbered details for multi-step behavior.

### 5.2 Shared business rules

Give independently testable shared rules their own identity, conditions and outcomes. Reference them from pages instead of copying competing versions.

## 6. Pages and interaction

### 6.1 Page inventory

Table: Page/endpoint | Client | Entry | Displayed content | Available operations | REQ/AC | Prototype reference. Without UI, state the technical objects and behavior retained; do not invent pages.

### 6.2 Interaction details

Per operation: data/loading/empty/error states, input constraints, submit result, cancel/navigation and recovery. Retain existing prototype IDs.

## 7. Permissions, errors and quality requirements

### 7.1 Permissions

Define PERM or retained requirement IDs: Role | Object/data scope | Allowed/prohibited | Enforcement expectation | Rejection result | AC.

### 7.2 Exceptions and recovery

Define EC or retained IDs: Trigger | Visible behavior | Data state | Recovery | AC. Distinguish failure from successful empty results.

### 7.3 Quality requirements

Independently testable quality requirements need identity, conditions, observable target and source/basis. Do not invent performance numbers or reliability promises.

## 8. Acceptance criteria

### 8.1 Acceptance definitions

Each AC: Requirement reference | Preconditions | Operation | Decidable expected outcome. Include normal, boundary and failure behavior required by the approved scope; distinguish risk observations from guaranteed behavior.

## 9. Dependencies, questions and stage arrangement

### 9.1 Dependencies and questions

Q ID | Gap/decision | Impact | Recommendation | Latest resolution point | Status/source. Dependencies identify parties/inputs and sequencing.

### 9.2 Stage and artifact arrangement

Record selected order, outputs/reuse/locations and endpoint. Preserve explicit limited scope without claiming standard completeness. No Scope document; no empty stages.
