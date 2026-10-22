# Shared delivery core

## Start from the commission

A delivery has one centralized material directory, a preserved original request, current requirements or adopted sources plus Scope, an endpoint, and a state record. Code stays in its existing locations. A single repository and several repositories use the same model; there is no project registration step, repository count limit, or route classification.

Understand the intended result, supplied evidence, authorized changes and endpoint. Record known answers instead of asking again. Clarify only gaps that affect this work, with a recommendation and its consequence. Do not promote assumptions into user decisions. A design-only commission may have no repository. A short bug fix still needs its original report, context, expected behavior, scope and acceptance criteria, but not a full PRD.

Use the configured material root (default `~/Aimship`), with one identifiable directory per delivery. Do not create it during installation. Before creating a new directory, use the user's explicit target or check a possible existing match; ambiguous candidates need selection, not a global “latest” pointer. If access fails, retain the request and intended location in the conversation and say what has not been saved. Continue the same delivery after access is restored.

Read repository instructions and existing tools for the relevant work. Record relevant pre-existing modifications and distinguish them from the delivery's changes. Do not clean a working tree, initialize Git, modify an unrelated repository, or expand write access merely to simplify the workflow.

## Independent deliveries and recorded overlap

Several independent deliveries may progress at the same time, each with its own material directory, goal, stages and state. One writing session **per delivery** is not a product-wide single-task limit. This check is workspace preparation based on records, not a cross-session lock or scheduler.

Check when code scope is associated or changed, before entering implementation, or when an actual code working directory changes. Do not repeat it every turn or stage. Once the code scope is known:

1. Enumerate all delivery directories in the accessible configured material root and any other explicitly known/authorized material roots or delivery locations. Read their `state.json` summaries; do not limit the search to recent folders. Do not scan the whole disk, code trees, processes, PRDs or full histories. Do not discover unknown custom roots by searching the home directory. Report roots checked and inaccessible, invalid or unknown-format records; unseen custom roots and non-Aimship work remain outside the check.
2. Exclude this delivery by `deliveryId`. Compare `repositories[].path` (the actual checkout/worktree root), role, `currentRun`, relevant `stageRuns` scope/progress, `outcome`, `next` and recorded update time. Repository IDs are local to each delivery and are not global repository identity. Use already recorded repository identity; when needed and accessible, read only local Git root/common-directory metadata for the associated paths to distinguish linked worktrees. Normalize existing paths to their actual location; nested paths in one checkout are not independent isolation. Distinct independent checkouts may share a recorded repository identity even with different Git directories. If identity/location cannot be established, report it as unknown rather than assuming separation.
3. Include older active, blocked or uncertain deliveries. A `done` stage, completed handoff, old timestamp or declined acceptance alone does not close a delivery. A recorded met goal with no recorded remaining code work is ended; otherwise use the existing explicit closing conclusion if needed. `not-met` or `unknown` is not automatically ended. Read only the relevant Scope/plan/conclusion section when state summaries cannot establish writing intent or closure. Do not rewrite another delivery's state. Ended deliveries are not active writers, although their unmerged results or known dependencies can still matter.
4. Compare actual writing intent and locations using the table below. A stage label alone is not permission to write code. Keep one brief result in the existing Scope/plan or results section, linked from the current delivery's existing references when needed: check occasion, roots/limits, relevant delivery IDs and recorded stages, actual directories, known dependencies and chosen arrangement. State stays authoritative; do not add a registry, index, second progress ledger or service.

| Recorded situation | Action |
| --- | --- |
| No known overlap | Continue without a new confirmation. Say “no overlap found among the recorded deliveries checked,” never guarantee there is no conflict. |
| Same repository, current work is requirements/design or explicitly read-only | Briefly identify related delivery and scope; continue that non-writing work and record any known business/interface dependency. Recheck before implementation. |
| Multiple deliveries preparing to modify the same actual checkout | Do not silently write concurrently. Identify the deliveries and recorded stages; use the user's existing choice of sequential implementation or a separate worktree/checkout. If unresolved, propose those choices and hold only the affected code writes. A recorded blocked writer does not prove its workspace has been released. |
| Same repository, distinct existing worktrees/checkouts | Reuse the existing isolation, do not create it again. File isolation does not guarantee conflict-free merging or compatible business changes. Record integration dependencies where known. |
| Different repositories with known shared API/database/test data/service | Record dependency and necessary sequencing or use arrangement in the existing plan. Do not operate real shared environments without authorization or build automatic dependency analysis. |

Records can be stale and cannot detect all other work. Do not switch another session's branch, stash, overwrite or clean unknown changes. The state tool's short write lock/revision check protects an individual state update; it does not reserve a checkout or enforce this workflow across sessions.

## Agree an ordered arrangement

Choose stages from the responsibilities below based on the goal and existing inputs. Requirements and scope alignment are always needed; they may be one short conversation and one document. Adopt adequate existing artifacts as inputs without claiming their stages were newly executed. Do not create empty stage runs or templates.

Show the selected order and endpoint. If the user already specified or accepted this arrangement, record the decision and proceed. An unanswered proposal remains a proposal. Once agreed, follow the order; adding, dropping or reordering work needs a reason and an updated record. Important changes follow [change flow](sources-and-changes.md). A stage may recur as distinct instances with stable IDs and explicit scopes.

Explain each design's key decisions, why they fit the requirements, tradeoffs, artifact location and remaining questions. Ordinary internal implementation choices stay with the agent. Ask for material changes to goals, scope, external behavior, compatibility, significant cost, data handling or an explicit technical commitment. Honor an agreed human review point, without adding approvals to every document.

## Stage references

Read the reference for the current responsibility, not all thirteen on every turn.

| Responsibility | Read when | Reference |
| --- | --- | --- |
| frame | Clarifying a problem or exploring a goal | [frame](stages/frame.md) |
| requirements | Defining or refining requirements | [requirements](stages/requirements.md) |
| prototype | Designing interaction and its states | [prototype](stages/prototype.md) |
| scope | Adopting inputs and aligning this commission | [scope](stages/scope.md) |
| diagnose | Investigating cause or feasibility | [diagnose](stages/diagnose.md) |
| tech-design | Choosing an engineering approach | [tech-design](stages/tech-design.md) |
| contract | Defining interfaces and exchanged data | [contract](stages/contract.md) |
| plan | Splitting implementation into dependent batches | [plan](stages/plan.md) |
| test-design | Mapping acceptance and risks to checks | [test-design](stages/test-design.md) |
| implement | Carrying out an authorized implementation batch | [implement](stages/implement.md) |
| review | Reviewing a batch, all batches, or affected rework | [review](stages/review.md) |
| verify | Executing the agreed checks and recording evidence | [verify](stages/verify.md) |
| handoff | Delivering against the current goal or handing over incomplete work | [handoff](stages/handoff.md) |

Each run records its scope, required inputs, results and progress. A result may be a section in a shared document. Proceed when this run's requirements are met, the next inputs exist, authorization covers it and no relevant unresolved issue blocks it. An issue blocks only dependent work; changing the order to continue other work is still an explicit plan change.

## Implementation and evidence

For multiple batches: implement batch → review batch, repeat; after every batch is complete and reviewed, review the whole change, then independently verify. For one batch, one review record may explicitly cover both batch and whole-change scopes. Do not create a complete testing gate after every batch. Planned tests can be written with implementation; writing them does not mean they passed.

Record review and verification against actual objects: repository ID, commit if any, relevant uncommitted/untracked paths and content digests or necessary patch, scope and baseline. Distinguish pre-existing changes. A branch name alone is insufficient. For documents record file/section and the content basis; preserve necessary old excerpts when a digest would not explain the reviewed meaning.

Each conclusion identifies who/what produced it, date, object/version, scope, basis, result and evidence. Distinguish user review, agent review, actual execution and user-reported results. Actual verification also records commands or operations, environment/data, case version and unexecuted checks. If the object changes during testing, determine which results remain applicable and retest affected checks.

Execution progress (`planned`, `active`, `blocked`, `done`) is separate from pass/fail/not-run/unknown, current applicability, goal achievement and user acceptance. A finished failed verification is still failed. Review is not runtime testing. Neither the presence of a report nor successful tool exit proves the goal.

## State and stopping

Use the installed tool's documented state protocol. Read the current revision before a write and provide the expected revision; never bypass a conflict by blindly increasing it. State stores summaries and references, not copies of requirements or test reports. Persist the unfinished intent before changing multiple documents, then verify the artifacts before recording completion. No cross-file transaction is promised.

Important semantic changes retain historical review and test facts, mark affected conclusions for review and update the current editable authority. Do not overwrite external adopted sources. See [sources and change flow](sources-and-changes.md).

At stable results save the state, remaining issues and next action. On a session switch give: “Use Aimship to continue <absolute delivery directory>; read state.json, the current goal/Scope and next-step inputs; <specific blocker if any>.” A new session reloads the same delivery, not the whole transcript. Use [recovery](recovery.md) for mismatch or uncertainty. Keep one active writing session per delivery.

End when the current confirmed goal is met. For design work this means the agreed design, not code execution. For development it includes agreed review and verification. “Show me the result” does not shorten the goal. If the user explicitly changes the endpoint, preserve the old goal, decision and unfinished work, update the arrangement, and assess the revised goal. An incomplete handoff is allowed but is not goal completion.

Small corrections within the original goal can reopen the same delivery: preserve its previous closure and result basis, increment the cycle, and review/verify affected work. A separate goal or substantial redesign starts a related delivery; retain the defect or source relationship without introducing parent/child scheduling. Prepared, accepted, merged and deployed are independent facts.
