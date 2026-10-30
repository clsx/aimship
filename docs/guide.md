# Aimship Guide

[中文](guide.zh-CN.md) · [README](../README.md)

[Delivery directory](#delivery-structure) · [1. Usage example](#start) · [2. Sessions and continuation](#guide-sessions) · [3. Requirements inputs and changes](#guide-inputs) · [4. Code and multiple deliveries](#guide-projects) · [5. Troubleshooting and maintenance](#troubleshoot)

<a id="24-check-current-work"></a>
<a id="44-delivery-structure-and-documents"></a>
<a id="results"></a>
<a id="3-inspect-progress-and-results"></a>
<a id="4-inspect-progress-and-results"></a>
<a id="4-inspect-progress-and-accept-results"></a>
<a id="check-current-work"></a>
<a id="artifacts"></a>
<a id="keep-only-useful-artifacts"></a>
<a id="related-references"></a>
<a id="appendix-sql-and-engineering-versions"></a>
<a id="document-details"></a>
<a id="sql-changes-and-progress"></a>
<a id="sql-and-engineering-versions"></a>
<a id="delivery-structure"></a>
<a id="stage-outputs-and-content"></a>
<a id="delivery-structure-and-documents"></a>
<a id="fixed-outlines-and-traceable-identifiers"></a>
<a id="guide-directory"></a>

## Delivery directory at a glance

The default materials root is `~/Aimship/` under your home directory, unless installation configured another location. **Each delivery has its own directory under that root; use the actual path in the AI’s receipt.** Explicitly state a different save location if needed.

Carry out the delivery in your AI tool workspace, with access to both existing materials and the Aimship delivery directory:

```text
AI tool workspace
├── Existing user project materials (supply as applicable; keep in place)
│   ├── Prototypes, PRDs and other reference documents (if available)
│   └── Project code (if available)
└── This request’s delivery directory, created by Aimship initialization
    └── Add original directory → ~/Aimship/20261027-login-signup/
```

[Activate Aimship and state the request](#guide-setup) below. Once initialization reports the actual path, add that delivery folder (`20261027-login-signup` in this example) to the current AI tool workspace, or grant access to it, then continue the delivery in this workspace. Provide access to existing project materials as needed; Aimship initialization does not create them. The directory name is only an example: do not create it manually in advance, copy the whole delivery, or create another set in the workspace.

The delivery directory contains these materials:

```text
~/Aimship/                         # Materials root
└── 20261027-login-signup/          # Example delivery directory
    ├── status.md                  # Current work, pending reviews, next action
    ├── .aimship/init.md           # Initialization context for the AI
    ├── prd.md                     # Requirements and acceptance criteria
    ├── prototype/index.html       # Page interaction prototype
    ├── tech-design.md             # Technical design
    ├── openapi.yaml               # HTTP interface contract
    ├── database.sql               # This example's single-database changes
    ├── testing.md                 # Cases and later execution results
    ├── plan.md                    # Implementation tasks and progress
    ├── review.md                  # Batch and overall reviews
    └── handoff.md                 # Results and handoff instructions
```

Materials develop gradually and are kept as needed. Search readable REQ, AC and TC numbers across documents; corresponding numbers stay consistent without requiring anchor links. A complete applicable PRD is adopted directly; partial adoption produces this iteration’s `prd.md`. `change-log.md` records important changes, and `diagnosis.md` is for standalone investigations. Open `status.md` for progress; tell the AI directly about requirement changes or acceptance decisions.

<a id="1-start-and-proceed"></a>
<a id="start"></a>
<a id="choose-the-requirement-authority"></a>
<a id="describe-the-work-and-its-endpoint"></a>
<a id="2-start-in-different-scenarios"></a>
<a id="1-first-use"></a>
<a id="guide-example"></a>
<a id="1-sign-up-and-login-a-delivery-example"></a>

<a id="1-aimship-delivery-walkthrough"></a>

## 1. Aimship usage example

Follow sign-up and login from requirements to acceptance. **This is fictional practice; wording and business choices need not be copied.** The example later supplies a project and isolated test database, with prototype review after requirements and before technical design. Actual prototype placement follows the delivery's needs.

Use one Aimship entry within a session; no invocation is needed at every stage. After completing and self-checking a stage, the AI saves its results, reports the stop and pauses. A new session is recommended at major work transitions, not after every stop. AI-authored or substantively revised reviewable documents await approval; questions affecting current work await clarification; other completed stages await continuation. You may say “approved, continue” once. Work within a stage stays continuous.

<a id="11-prepare-a-workspace"></a>
<a id="12-activate-aimship-and-describe-the-request"></a>
<a id="13-check-the-saved-result-and-answer-necessary-questions"></a>
<a id="prepare-a-workspace"></a>
<a id="hosts"></a>
<a id="1-select-aimship-in-your-host"></a>
<a id="1-select-aimship-in-your-ai-development-tool"></a>
<a id="1-select-aimship-in-your-ai-tool"></a>
<a id="activate-aimship-and-describe-the-request"></a>
<a id="check-the-saved-result-and-answer-necessary-questions"></a>
<a id="install"></a>
<a id="starting-without-a-requirements-document"></a>
<a id="guide-setup"></a>

### 1.1 Activate Aimship and state the request

**User actions:** Explicitly request Aimship and state the goal. For example:

> Use Aimship for username/password sign-up, login, logout and a home page requiring login. Complete development and local verification; I will supply code later.

For existing prototypes, PRDs or other documents, supply their original locations; originals stay in place and you need not copy them manually. Following the source rules, the AI retains copies of the formally adopted versions and necessary dependencies under this delivery's `source/` and records the adoption basis in the existing source record. Materials consulted only as background need not be copied in full. Before later revisions, identify the editable artifact; new versions do not overwrite earlier evidence.

**AI processing:** Determines the delivery directory and checks access, preserves the request, creates or resumes the delivery, and reports the actual saved directory, current work and next action. It starts requirement intake on the standard sequence without a full-delivery/design-only/init-only choice; explicit limits or pauses are respected. If access is unavailable, it asks you to add that directory or grant access; it does not relocate the delivery into the workspace.

The standard endpoint is implementation, review, independent verification and delivery acceptance; no extra scope choice is needed. On initialization, the AI reminds you to add the actual delivery directory to your current project/workspace, ignoring the reminder if already added.

**Outputs:** `.aimship/init.md` keeps the original commission, material locations and initialization context for the AI; `status.md` shows the full stage sequence and statuses, current position, pending documents, blocking questions and next action. For a new delivery, the AI saves your preferred language, or otherwise the language of the current conversation. Status and new documents use that language; filenames, IDs, original sources and existing documents remain unchanged.

<a id="14-read-the-document-and-give-a-decision"></a>
<a id="15-continue-after-approval"></a>
<a id="review"></a>
<a id="review-documents-and-continue"></a>
<a id="3-proceed-and-review"></a>
<a id="2-review-and-proceed"></a>
<a id="read-the-document-and-give-a-decision"></a>
<a id="continue-after-approval"></a>
<a id="guide-requirements"></a>
<a id="guide-prototype"></a>
<a id="12-review-requirements-and-acceptance-criteria"></a>
<a id="13-review-pages-and-interaction"></a>

### 1.2 Confirm requirements

**User actions:** Supply the input you have.

- No PRD/prototype: describe features and expected behavior, such as “Usernames must be unique; after logout, the home page must require login again.”
- Existing materials: provide the PRD/prototype location, version and adopted scope. Say what is available even if it is incomplete.

When you provide a complete applicable PRD/prototype and ask to deliver from it, the AI adopts it unchanged without asking you to review the source again. Source copies and management records do not require individual review. Clarification is needed only for specific questions affecting progress. Review requirements or prototypes the AI writes, narrows or substantively changes: check scope, acceptance criteria and page behavior, then approve or give feedback. Valid approval of the current output content is reused.

**AI processing:** Adopts a complete applicable PRD without rewriting or renumbering. For partial adoption, it writes this iteration’s PRD with sources, inclusions, exclusions and acceptance, retaining source IDs where possible. Without a PRD, discussion produces one. Prototypes are optional; adequate existing ones are reused. It self-checks, confirms and saves each selected document, preserving originals.

**Outputs:** The newly authored `prd.md` or retained PRD in `source/` is the requirement authority, without a separate Scope. This example selects `prototype/index.html` for pages and feedback states. A prototype is not implemented authentication; interaction checks not performed remain unverified.

<a id="guide-session-example"></a>

**New-session example:** After this example's requirements and prototype are approved and saved, stop writing in the old session and explicitly activate Aimship in a new one:

> Use Aimship to continue the sign-up and login delivery at “actual delivery directory.” First read its state, approved materials and pending reviews.

The AI rechecks access to the same delivery directory, reads its state and confirms technical design as next. If reviews remain pending, it stops there, without reinitializing or asking you to repeat all background. Staying in the original session is also fine.

<a id="guide-design"></a>
<a id="14-review-the-technical-design"></a>

### 1.3 Review the technical design

**User actions:** Supply the project location and known test conditions. Open the design, check password protection, login state, access control and data changes, then approve or give feedback.

**AI processing:** Reads the project, checks technical conditions and designs the implementation and risk handling. It resolves missing essential facts and prepares interfaces/SQL after design approval.

**Outputs:** `tech-design.md` explains the implementation and tradeoffs. It plans later SQL; finished SQL is not required at this point.

<a id="guide-contracts"></a>
<a id="15-review-interface-and-sql-documents-individually"></a>

### 1.4 Review interface and SQL documents individually

**User actions:** For the interface review, check requests, responses, errors and authentication. For SQL, check the target database, structure, change order and execution conditions. Approve or request changes separately.

**AI processing:** Prepares applicable documents from the approved design, self-checks each and waits for review. Test design follows their approval. Existing authoritative contracts are reused; no relevant change means no file, and multiple databases have separate SQL.

**Outputs:** This example's `openapi.yaml` defines HTTP interfaces; `database.sql` describes single-database changes. **Document approval does not authorize SQL execution or changes to migration mechanisms.**

<a id="guide-cases"></a>
<a id="16-review-test-cases"></a>

### 1.5 Review test cases

**User actions:** Open the cases and check expected outcomes for normal sign-up/login, duplicate usernames, incorrect passwords, unauthenticated access and access after logout. Approve or identify gaps.

**AI processing:** Turns acceptance criteria into checkable cases, with environment and coverage details. It prepares the implementation plan after case approval.

**Outputs:** The cases section of `testing.md`. Test execution results do not exist yet.

<a id="guide-plan"></a>
<a id="17-review-the-implementation-plan"></a>

### 1.6 Review the implementation plan

**User actions:** Open the plan, check scope, dependencies, batches and verification arrangements, then approve or give feedback.

**AI processing:** Splits tasks by engineering dependencies, such as authentication/session work before pages and access control, including test code and reviews. Implementation waits for the plan and required document approvals; even one batch needs a plan.

**Outputs:** `plan.md` explains each batch's work, dependencies and checks.

<a id="guide-implement"></a>
<a id="18-implement-batches-and-review-each-batch"></a>

### 1.7 Implement batches and review each batch

**User actions:** Inspect changes and progress; point out deviations, such as “The post-sign-up redirect differs from the prototype.” No line-by-line approval of execution logs is needed; inspect the saved stage result and ask to continue.

**AI processing:** Implements the plan and reviews each batch, saving and stopping after implementation and after review. Continuation advances only after blocking issues are resolved. All batches are followed by overall review, then verification. Requirement changes return to the relevant review.

**Outputs:** Project code, execution progress appended to `plan.md`, and batch findings and repairs in `review.md`.

<a id="guide-overall"></a>
<a id="19-review-the-complete-change"></a>

### 1.8 Review the complete change

**User actions:** Read the overall findings and remaining issues, pointing out omissions if needed. Review records do not need a separate document approval; inspect the conclusion and ask to continue.

**AI processing:** Checks all actual changes and connections across sign-up, login, logout and home-page access. It resolves issues blocking independent verification, saves the conclusion and stops before continuing to verification. A single-batch review can explicitly cover both batch and overall scope.

**Outputs:** Overall conclusions appended to `review.md`. Code review does not replace running tests.

<a id="guide-verify"></a>
<a id="110-run-verification-and-handle-failures"></a>

### 1.9 Run verification and handle failures

**User actions:** Provide the agreed isolated test environment, read execution results and supply reproduction details or missing conditions. Separately authorized operations need an explicit target and action.

**AI processing:** Runs cases against reviewed code, distinguishing passed, failed and unexecuted checks. It reviews fixes and retests while retaining failure history; requirement/design issues return to the relevant materials.

**Outputs:** Actual code, environment, results and evidence appended to the same `testing.md`. Missing necessary verification is reported, not marked passed.

<a id="25-accept-the-delivered-result"></a>
<a id="completion"></a>
<a id="decide-when-work-is-done"></a>
<a id="7-complete-a-delivery"></a>
<a id="8-complete-a-delivery"></a>
<a id="accept-the-delivered-result"></a>
<a id="guide-handoff"></a>
<a id="111-inspect-and-accept-the-result"></a>

### 1.10 Inspect and accept the result

**User actions:** Follow the handoff instructions to inspect the feature. Explicitly accept it when it meets the goal, or describe actual versus expected behavior.

**AI processing:** Summarizes results and remaining work, and records your actual acceptance decision. Complete delivery needs evidence of required document approvals, batch/overall review, independent verification and final acceptance.

**Outputs:** `handoff.md` provides result locations, usage, verification conclusions and integration status. Earlier document approvals do not replace final acceptance.

<a id="guide-sessions"></a>

## 2. Sessions and continuation

<a id="2-sessions-progress-and-acceptance"></a>
<a id="21-resume-in-a-new-session"></a>
<a id="23-session-grouping-suggestions"></a>
<a id="continue"></a>
<a id="continue-in-another-conversation"></a>
<a id="5-resume-after-a-pause-or-in-another-session"></a>
<a id="6-resume-after-a-pause-or-in-another-session"></a>
<a id="6-session-arrangements-and-continuing-work"></a>
<a id="continuing-an-existing-delivery-or-switching-sessions"></a>
<a id="3-continue-next-time"></a>
<a id="arrange-the-next-session-and-hand-off"></a>
<a id="resume-in-a-new-session"></a>
<a id="session-grouping-suggestions"></a>
<a id="guide-continue"></a>
<a id="21-switch-sessions-and-resume"></a>

### 2.1 When to switch sessions

Consider a new session after requirements before technical design, after design and applicable contracts before test design, after the plan before implementation, after each batch and its review, and after overall review before independent verification. Combine coinciding boundaries. Resume pending review before advancing; directory creation and small steps within a stage need no session change.

Review open questions with their document, including impact, recommendation and when an answer is needed. Nonblocking questions can remain open; document approval does not answer every question.

At each completed stage, follow the stop in `status.md`: approve or give feedback on pending documents, or ask to continue completed work. Changing sessions is optional; “continue” does not approve a pending document. The page prioritizes current actions and shows future stages as not started, not current defects.

See the [new-session example](#guide-session-example). Keep one writing session per delivery. Trusted records can locate it directly; missing or ambiguous matches prompt clarification. The saved delivery language carries over. If switching before the first save, carry the unsaved request, intended location and pending operations.

<a id="22-continue-after-work-stops-unexpectedly"></a>
<a id="continue-after-work-stops-unexpectedly"></a>
<a id="guide-recovery"></a>
<a id="32-interruptions-repeated-activation-or-inconsistent-progress"></a>

### 2.2 Recover after an interruption

Provide the original delivery directory, interrupted action and error. The AI checks saved state, files and unfinished operations while preserving identity and materials. If state saved but the progress page failed, it repairs only the missing view. Repeated activation does not reinitialize.

Manual progress-page edits are preserved first; conflicts need coordination. Do not approve work by editing that page. If code moves, provide its new location so the AI can check identity before updating the association.

<a id="3-other-starting-points-and-work-arrangements"></a>
<a id="scenarios"></a>
<a id="5-other-starting-points-and-work-arrangements"></a>
<a id="guide-other"></a>
<a id="2-other-usage-notes"></a>
<a id="guide-inputs"></a>

## 3. Requirements inputs and changes

<a id="31-working-from-an-existing-prd-prototype-or-other-materials"></a>
<a id="working-from-an-existing-prd-prototype-or-other-materials"></a>
<a id="guide-adoption"></a>
<a id="23-start-with-an-existing-prd-prototype-or-other-materials"></a>
<a id="33-turning-the-current-discussion-into-a-delivery"></a>
<a id="turning-the-current-discussion-into-a-delivery"></a>
<a id="guide-discussion"></a>
<a id="25-carry-over-an-existing-discussion"></a>

### 3.1 Existing materials or discussion

Provide the PRD, prototype or screenshot locations, versions and scope to use. The AI checks them as described in [Confirm requirements](#guide-requirements). A complete applicable PRD is adopted directly; partial adoption produces an iteration PRD without changing the original. Explicitly request edits to the original if needed. File presence alone does not establish intent to use it. A clear request to deliver from unchanged supplied material establishes adoption, without a repeated source review; review AI-written changes instead.

For prior discussion, say “Use Aimship to continue the requirements we just discussed.” The AI organizes visible requests, decisions and open questions. Supply history it cannot see; suggestions are not approvals.

<a id="16-changing-approved-requirements"></a>
<a id="5-requirements-change-during-delivery"></a>
<a id="changes"></a>
<a id="review-verify-and-change"></a>
<a id="4-requirements-change-during-delivery"></a>
<a id="changing-approved-requirements"></a>
<a id="guide-changes"></a>
<a id="22-change-approved-content"></a>

### 3.2 Change approved content

Explain what changes, why, and what stays the same; identify any documents you edited yourself. The AI records important changes in `change-log.md`. Newly supplied unchanged inputs are checked and adopted; affected AI outputs are resubmitted for review before dependent work continues. Unaffected work, earlier approvals and test history remain.

Maintain initialization details normally, preserving the original commission in `.aimship/init.md`; record new requirements in the PRD and change log. Typos and formatting need no full re-review. Small fixes can continue the same delivery; a new goal or major redesign gets a separate delivery linked to the original.

<a id="guide-limits"></a>
<a id="27-stop-at-a-limited-goal"></a>

### 3.3 Complete only part of the goal

State if you only need requirements or design, or explicitly exclude testing. The AI records the endpoint and omissions, labels the handoff as partial and never marks untested work passed. Asking to “see a preview first” does not change the goal.

Only standalone investigation uses `diagnosis.md`; ordinary debugging adds no investigation stage.

<a id="guide-projects"></a>

## 4. Code and multiple deliveries

<a id="32-changing-a-feature-fixing-a-defect-or-refactoring"></a>
<a id="34-associating-code-after-requirements-have-started"></a>
<a id="changing-a-feature-fixing-a-defect-or-refactoring"></a>
<a id="associating-code-after-requirements-have-started"></a>
<a id="guide-code"></a>
<a id="24-change-existing-code-or-associate-it-later"></a>

### 4.1 Associate code, fix defects or refactor

Provide the code directory, for example: “The code is at ‘project directory’; continue the current delivery.” The AI keeps the delivery directory and review records. It may read existing behavior early; edits still follow the agreed scope. Findings affecting approved content return for review. A remote address does not trigger automatic cloning or relocation.

For defects, provide expected behavior, the problem and reproduction steps or logs. For refactoring, state the improvement goal and behaviors to preserve.

<a id="35-progress-several-deliveries-at-once"></a>
<a id="7-progress-several-deliveries-at-once"></a>
<a id="parallel"></a>
<a id="work-on-two-requests-at-once"></a>
<a id="6-progress-several-deliveries-at-once"></a>
<a id="progress-several-deliveries-at-once"></a>
<a id="guide-parallel"></a>
<a id="26-work-on-several-requests"></a>

### 4.2 Work on several requests

Keep each delivery separate and identify shared code, interfaces, databases or environments. Analysis can run concurrently; sequence edits to the same code, or use separate working directories and plan the merge.

Pre-existing edits from other requests are not added to this requirement or cleaned merely because the working tree is dirty. Engineering baselines stay in engineering records, not the business PRD.

The AI checks only known, accessible deliveries; it does not lock or schedule other sessions. Describe other ongoing changes and check the merged result afterward.

<a id="4-problems-and-references"></a>
<a id="troubleshoot"></a>
<a id="8-problems-during-use"></a>
<a id="9-problems-during-use"></a>
<a id="6-problems-and-references"></a>
<a id="guide-troubleshoot"></a>
<a id="3-access-recovery-and-versions"></a>
<a id="guide-maintenance"></a>

## 5. Troubleshooting and maintenance

<a id="41-common-problems"></a>
<a id="guide-access"></a>
<a id="31-workspace-and-access"></a>

### 5.1 A directory is inaccessible

Use the actual path reported by the AI to add the original delivery directory or grant the needed permissions in your AI tool. If the directory has not been created, use the tool’s supported controls to authorize the necessary parent directory, then continue initialization. Do not copy the delivery or create another one elsewhere.

Reading a file does not prove it can be saved; the AI should report success from actual read/write results. Aimship does not operate permission controls for you. Keep unsaved requests in the current conversation; once access is restored, inspect existing files before continuing. Installation does not automatically create delivery directories or grant access.

<a id="43-ai-tool-integration-notes"></a>
<a id="ai-tool-integration-notes"></a>
<a id="guide-hosts-notes"></a>
<a id="34-missing-entries-and-host-differences"></a>
<a id="34-missing-entries-and-ai-tool-differences"></a>
<a id="guide-tools"></a>

### 5.2 The Aimship entry is missing

Check installation status through the README, then try a new session or refresh your AI tool’s Skill list and explicitly select Aimship. The available entry depends on the tool’s version and supported controls; a healthy installation does not prove the Skill is loaded.

For duplicate entries, check their sources and versions while preserving custom content. Codex and Cursor share an installed entry, so do not simply delete duplicates. Real discovery, permissions and cross-tool continuation are not fully verified. See [Cursor documentation](https://cursor.com/docs/skills) and [Codex Skill locations](https://learn.chatgpt.com/docs/build-skills).

<a id="42-continue-an-existing-delivery-after-upgrading-aimship"></a>
<a id="continue-an-existing-delivery-after-upgrading-aimship"></a>
<a id="guide-upgrade"></a>
<a id="33-continue-after-upgrading"></a>

### 5.3 Continue after upgrading

Save current work before [upgrading through the README](../README.md#update). Activate Aimship again afterward and check the actual bound version and delivery state; installation itself does not update delivery records.

Use ordinary Markdown and searchable numbers to record delivery. Check the impact of rule changes and preserve actual approvals and test records without inventing results.

<a id="45-installation-and-maintenance-references"></a>
<a id="installation-and-maintenance-references"></a>
<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="uninstall"></a>
<a id="guide-references"></a>
<a id="35-installation-maintenance-and-feedback"></a>

### 5.4 Maintenance and feedback

See the [README](../README.md#update) for installation, upgrades, adding AI tools, version and health checks, or [uninstallation](../README.md#uninstall) for removal. Health checks inspect installation files and configuration; they do not repair delivery documents. For an interrupted installation or missing files, follow the corresponding README instructions rather than reinstalling blindly.

For feedback, provide versions, actions, expected and actual results, and minimal reproduction steps. Redact credentials, personal paths and business data before filing an [Issue](https://github.com/clsx/aimship/issues). See [Contributing](../CONTRIBUTING.md) for development and the [CLI document](cli.md) for tool protocols.
