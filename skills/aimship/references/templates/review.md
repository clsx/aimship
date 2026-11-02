# review

Delivery: <deliveryId from init>; document revision: <revision>.

## 1. Review basis and scope

### 1.1 Current review (generated)

Pending state generation.

### 1.2 Review basis

State the requirements/design/plan references and review scope. Put each review's actual repositories, baseline plus differences, reviewer and date with its REV record. Keep object details readable and link the exact manifest when useful. Replace guidance with actual content; never prefill a result.

## 2. Review records

Use a separate REV subsection for each batch, overall or repair review. Within it write:

- Scope and object: B/TASK and relevant REQ/AC, repositories/baseline/differences, reviewer and date.
- Assessment: requirements/contract consistency and code quality in this scope; reference relevant checks without repeating implementation or test-command logs.
- Findings: Finding | Severity/impact | File/section/symbol | Problem and basis | Disposition/status. Use a readable local finding label when a repair/recheck needs to refer back to it. If no findings, state the reviewed scope/object and brief passing conclusion without an empty table or a command transcript.
- Repairs and recheck: associate each finding with the actual change, rechecked object and conclusion; distinguish resolved, open and explicitly deferred work.

Keep overall review separate from batch records. Replace guidance with actual content; never prefill a result.

## 3. Open findings and current conclusion

Explain remaining findings and whether they block continuation, citing their REV records and disposition. The generated current review section above owns the effective result summary; do not create a second current-status table or accumulate obsolete “next batch” instructions here. Distinguish review findings from unexecuted validation and link testing.md for runtime coverage and missing conditions. Historical conclusions remain inside their REV records for the old objects. Review is not runtime validation or user acceptance. Replace guidance with actual content; never prefill a result.
