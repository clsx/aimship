# testing

Delivery: <deliveryId from init>; document revision: <revision>.

Basis: identify the authoritative inputs and versions. Summary: state the effective proposal or the object reviewed/executed, without a second progress ledger.

Replace guidance with actual content. Retain every section; state the concrete reason for inapplicability. An unknown applicable detail is a gap with impact and a resolution point, never “not applicable”.

**Contents**

- [1. Basis and scope](#1-basis-and-scope)
- [2. Environment, data and execution conditions](#2-environment-data-and-execution-conditions)
- [3. Case index and details](#3-case-index-and-details)
- [4. Coverage and verification arrangement](#4-coverage-and-verification-arrangement)
- [5. Formal verification and execution records](#5-formal-verification-and-execution-records)
- [6. Defects and unfinished work](#6-defects-and-unfinished-work)

## 1. Basis and scope

### 1.1 Basis and scope

List current requirements/AC, design/contracts/SQL and risks with versions. For verify-only identify adopted cases and their actual authority.

### 1.2 Verification choices

Explain selected methods and real assertion layers using project tools; no fixed category count or invented coverage target.

## 2. Environment, data and execution conditions

### 2.1 Environment and tools

Table: Service/client | Known version/entry or unresolved value | Tool/command | Permission/resources | Availability. Missing execution access does not remove a valid case.

### 2.2 Data matrix

Table: Data label | Input and pre-state | Construction/isolation/reset | Applicable cases | Required combinations. Enumerate combinations or specify an exact rule; never leave the executor to guess Cartesian products or representative samples.

### 2.3 Preparation gaps

Gap | Affected TC/combination | Impact | Resolution condition. Actual environment and versions also belong in each RUN.

## 3. Case index and details

### 3.1 Case index

Short table: TC reference | Scenario | REQ/AC | Method | Detail location. IDs here are citations; each TC is uniquely defined in its detail heading below.

### 3.2 Case details

Create a numbered detail heading containing each TC ID, followed by its concrete objective and REQ/AC before any subheadings. Include preconditions/data labels and required combinations, ordered steps with a corresponding expected result per step, frontend/service/storage assertions actually applicable, execution entry and evidence requirements. Different independently decidable outcomes/side effects use distinct TCs; identical rules across data use matrix rows. Keep long steps out of index cells.

## 4. Coverage and verification arrangement

### 4.1 Coverage index

Tables: AC/rule → TC; interface branch → TC; page operation/state → TC. Explain dimensions absent from the actual change. IDs are references, not definitions.

### 4.2 Execution arrangement

List order, real integrated entry points, data combinations and reused assertions. Mock/component checks do not establish live integration. Mark risk observations and accepted exceptions separately from functional guarantees.

## 5. Formal verification and execution records

### 5.1 Current verification (generated)

Pending state generation.

### 5.2 Formal runs and retests

Each RUN: TC/required combination | Case-document version | Exact code/build object | Environment | Actual ordered operations/commands | Observed versus expected assertions | Passed/failed/blocked/not-run | Evidence. Retests use a new RUN and retain failures. A TC is passed only when ALL its required combinations and assertions pass; do not submit partial coverage as a whole-case pass. Record incomplete combinations as incomplete/blocked with evidence until full coverage is available. Development checks stay in plan notes and do not become formal verification.

## 6. Defects and unfinished work

### 6.1 Defects and disposition

Cite RUN/REV findings, affected cases, resolution and retest condition. Do not duplicate the generated current result table.

### 6.2 Unfinished verification

List unavailable conditions, unexecuted combinations and next action. Historical results stay tied to their original object and case version. Never introduce new TC definitions or changed expectations below chapter 5.
