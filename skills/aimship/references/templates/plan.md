# plan

Delivery: <deliveryId from init>; document revision: <revision>.

Basis: identify the authoritative inputs and versions. Summary: state the effective proposal or the object reviewed/executed, without a second progress ledger.

Replace guidance with actual content. Retain every section; state the concrete reason for inapplicability. An unknown applicable detail is a gap with impact and a resolution point, never “not applicable”.

**Contents**

- [1. Implementation basis and scope](#1-implementation-basis-and-scope)
- [2. Batch outcomes and dependencies](#2-batch-outcomes-and-dependencies)
- [3. Tasks and completion criteria](#3-tasks-and-completion-criteria)
- [4. Review and independent verification arrangement](#4-review-and-independent-verification-arrangement)
- [5. Current execution and history](#5-current-execution-and-history)
- [6. Deviations, blockers and remaining work](#6-deviations-blockers-and-remaining-work)

## 1. Implementation basis and scope

### 1.1 Approved basis

List requirements, design, contracts, SQL and test-case versions and references, actual repositories and authorized scope.

### 1.2 Coverage boundary

Identify included engineering objects and excluded work with the decision basis.

## 2. Batch outcomes and dependencies

### 2.1 Batch definitions

Table: B | Observable outcome | Dependency B | Included TASKs | REQ/AC. Repairs remain in their business batch.

### 2.2 Internal and cross-repository order

For each batch, list implementation order and cross-engineering interface/data/configuration dependencies, with entry/completion conditions.

## 3. Tasks and completion criteria

### 3.1 Task definitions

One TASK per row: TASK | B | REQ/AC or risk basis | Repository | File/class/component | Concrete change | Completion criteria | Design/contract reference. Cover every new/changed interface, consumer/job, data change and page/component. A task may cover several related objects; do not replace object and completion fields with a summary.

### 3.2 Coverage self-check

Map changed objects to their TASKs; keep this an index, not another definition or progress ledger.

## 4. Review and independent verification arrangement

### 4.1 Review arrangement

Each business batch gets review, then all implementation gets overall review. Specify objects/baselines and necessary repair/recheck arrangements.

### 4.2 Independent verification

Reference approved testing coverage, conditions and independent verification after overall review. Test-code work may be in batches; do not add per-batch full test gates. Explicit excluded verification remains an untested partial handoff.

## 5. Current execution and history

### 5.1 Current batch progress (generated)

Pending state generation.

### 5.2 Execution notes and history

Only necessary dated object/version, action, development check, result, deviation and evidence links. Detailed findings belong in review; formal RUNs in testing. Submit facts through the tool. Never define changed B/TASK obligations here or create another current progress table.

## 6. Deviations, blockers and remaining work

### 6.1 Deviations and blockers

Reference actual CHG/REV and affected tasks; state impact, recovery condition and next action. Do not redefine task completion conditions after the approval boundary.

### 6.2 Remaining actions

List unfinished effects and evidence needed, citing approved definitions rather than repeating a stage ledger.
