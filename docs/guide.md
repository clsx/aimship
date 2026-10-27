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

The default materials root is `~/Aimship/`, unless installation configured another location. **Each delivery has its own directory; use the actual path in the AI's receipt.** Code stays in its project.

```text
~/Aimship/                         # Materials root
└── 20261027-login-signup/          # Example delivery directory
    ├── status.md                  # Current work, pending reviews, next action
    ├── source/request.md          # Original request
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

Materials develop gradually and are kept as needed. `scope.md` adopts authoritative external requirements, `change-log.md` records important changes, and `diagnosis.md` is for standalone investigations. Open `status.md` for progress; tell the AI directly about requirement changes or acceptance decisions.

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

Use one Aimship entry within a session, then continue after approval as arranged; no invocation is needed at every stage. When your review is required, the AI presents one item at a time and waits for a clear decision. Revisions return for review.

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

Follow the README to [install](../README.md#install), then open an accessible workspace in your AI tool. No PRD or code is needed to start.

**User actions:** Explicitly request Aimship and state the goal. For example:

> Use Aimship for username/password sign-up, login, logout and a home page requiring login. Complete development and local verification, without deployment; I will supply code later.

**AI processing:** Preserves the request, creates or resumes a delivery, and reports its saved directory, current work and next action. It asks necessary clarifying questions.

**Outputs:** `source/request.md` preserves your words; `status.md` shows progress.

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

Open the presented requirements document and applicable prototype separately. Check scope, acceptance criteria and page behavior; approve the current item or identify what needs changing.

**AI processing:** Clarifies gaps, preserves authoritative external originals and reuses sufficient prototype coverage. Without materials, it writes requirements first, then creates the needed prototype after approval in this example's arrangement. No interaction change means no new prototype. It self-checks, submits, records approval and continues one item at a time.

**Outputs:** `prd.md` states requirements and acceptance criteria, or `scope.md` records the adopted scope. This example creates `prototype/index.html` for pages and feedback states. A prototype is not implemented authentication; interaction checks not performed remain unverified.

<a id="guide-session-example"></a>

**New-session example:** After this example's requirements and prototype are approved and saved, stop writing in the old session and explicitly activate Aimship in a new one:

> Use Aimship to continue the sign-up and login delivery at “actual delivery directory.” First read its state, approved materials and pending reviews.

The AI resumes the original delivery and confirms technical design as next. If reviews remain pending, it stops there, without reinitializing or asking you to repeat all background. Staying in the original session is also fine.

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

**User actions:** Inspect changes and progress; point out deviations, such as “The post-sign-up redirect differs from the prototype.” No line-by-line approval of execution logs is needed.

**AI processing:** Implements the plan, reviews each batch and resolves blocking issues before the next. After all batches, it performs the overall review before verification. Requirement changes return to the relevant review.

**Outputs:** Project code, execution progress appended to `plan.md`, and batch findings and repairs in `review.md`.

<a id="guide-overall"></a>
<a id="19-review-the-complete-change"></a>

### 1.8 Review the complete change

**User actions:** Read the overall findings and remaining issues, pointing out omissions if needed. Each review entry does not need a separate document approval.

**AI processing:** Checks all actual changes and connections across sign-up, login, logout and home-page access. It resolves issues blocking independent verification. A single-batch review can explicitly cover both batch and overall scope.

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

**Outputs:** `handoff.md` provides result locations, usage, verification conclusions and merge/deployment status. Earlier document approvals do not replace acceptance, and completed development does not mean deployed.

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

Follow suggestions in `status.md` between requirements, technical design/applicable contracts, cases, plan, implementation batches, overall review and verification batches, or stay in the same session. Grouping does not change individual document reviews.

See the [new-session example](#guide-session-example). Keep one writing session per delivery. Trusted records can locate it directly; missing or ambiguous matches prompt clarification. If switching before the first save, carry the unsaved request, intended location and pending operations.

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

See [Confirm requirements](#guide-requirements) for PRD/prototype input. Scattered screenshots and discussion can inform requirements; identify the location, version and adopted scope of additional materials. An editable PRD explicitly commissioned for maintenance can be reused if it fully states this scope, authorization and endpoint. It still needs review; its production history is not invented.

For an existing discussion, say “Use Aimship to carry forward the request we just discussed.” The AI preserves visible wording, decisions and open questions without repeating answered questions. It identifies gaps in unavailable history; suggestions are not approvals.

<a id="16-changing-approved-requirements"></a>
<a id="5-requirements-change-during-delivery"></a>
<a id="changes"></a>
<a id="review-verify-and-change"></a>
<a id="4-requirements-change-during-delivery"></a>
<a id="changing-approved-requirements"></a>
<a id="guide-changes"></a>
<a id="22-change-approved-content"></a>

### 3.2 Change approved content

Explain the change, reason and what should remain; identify document edits made outside the session. The AI records impact in `change-log.md`, preserves originals, resubmits affected documents and holds dependent work. Old approvals and test results remain historical evidence.

Unaffected work is retained; typo or formatting edits need no full re-review. Small post-completion fixes can continue the same delivery; a new goal or major redesign starts a related one.

<a id="guide-limits"></a>
<a id="27-stop-at-a-limited-goal"></a>

### 3.3 Complete only part of the goal

If you explicitly request requirements/design only or exclude testing, the AI records the endpoint and consequences, then hands off the authorized work. Untested work is labeled, and partial results are distinguished from standard complete delivery. Asking for a preview does not shorten the original goal. Only standalone investigation needs `diagnosis.md`; ordinary debugging adds no investigation stage.

<a id="guide-projects"></a>

## 4. Code and multiple deliveries

<a id="32-changing-a-feature-fixing-a-defect-or-refactoring"></a>
<a id="34-associating-code-after-requirements-have-started"></a>
<a id="changing-a-feature-fixing-a-defect-or-refactoring"></a>
<a id="associating-code-after-requirements-have-started"></a>
<a id="guide-code"></a>
<a id="24-change-existing-code-or-associate-it-later"></a>

### 4.1 Associate code, fix defects or refactor

When code becomes available, say “Associate ‘project directory’ with the current delivery.” The materials directory and approval history continue; association does not authorize code changes. The AI may read code early when requirements depend on existing behavior. New facts affecting approved conclusions follow change handling. A remote URL records a source, without automatic cloning or relocation.

For defects, provide expected/current behavior, reproduction conditions or logs. For refactoring, state the technical goal and external behavior that must remain.

<a id="35-progress-several-deliveries-at-once"></a>
<a id="7-progress-several-deliveries-at-once"></a>
<a id="parallel"></a>
<a id="work-on-two-requests-at-once"></a>
<a id="6-progress-several-deliveries-at-once"></a>
<a id="progress-several-deliveries-at-once"></a>
<a id="guide-parallel"></a>
<a id="26-work-on-several-requests"></a>

### 4.2 Work on several requests

Keep each delivery separate and identify shared code, interfaces, databases or environments. Requests can be analyzed concurrently; before writing the same code, sequence the work or use separate checkouts/worktrees.

The AI checks accessible known deliveries for overlap and records coordination. It has no global lock or automatic scheduler and may miss outside work or stale records. A completed branch does not establish integration completion.

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

Provide the path and error. Reuse an accessible project workspace; open an existing parent or create/open the target using the AI tool's supported controls, then grant necessary access. Installation does not create delivery materials or grant permissions, and another project's access may not apply. Preserve an unsaved request and continue the same delivery when access is restored.

<a id="43-ai-tool-integration-notes"></a>
<a id="ai-tool-integration-notes"></a>
<a id="guide-hosts-notes"></a>
<a id="34-missing-entries-and-host-differences"></a>
<a id="34-missing-entries-and-ai-tool-differences"></a>
<a id="guide-tools"></a>

### 5.2 The Aimship entry is missing

Current entry conventions: the Skill selector in Codex, `$aimship` in its CLI, and `/aimship` in Cursor/Claude Code. After installation, try a new session or refresh the Skill list. Behavior depends on the actual AI tool version.

Codex and Cursor share an installed entry; check source/version for duplicates while preserving custom content. Installation health does not prove loading, and real discovery, permissions and cross-tool continuation are not fully verified. See [Cursor documentation](https://cursor.com/docs/skills) and [Codex Skill locations](https://learn.chatgpt.com/docs/build-skills).

<a id="42-continue-an-existing-delivery-after-upgrading-aimship"></a>
<a id="continue-an-existing-delivery-after-upgrading-aimship"></a>
<a id="guide-upgrade"></a>
<a id="33-continue-after-upgrading"></a>

### 5.3 Continue after upgrading

[Upgrade through the README](../README.md#update). Save first, check the actual version and delivery records, and open a new session if needed. Updating software does not replace rules already loaded in an old session.

Preserve earlier results and approvals. Handle migration or adoption of new rules explicitly at a stable boundary; unknown formats stay read-only, without invented approvals or tests.

<a id="45-installation-and-maintenance-references"></a>
<a id="installation-and-maintenance-references"></a>
<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="uninstall"></a>
<a id="guide-references"></a>
<a id="35-installation-maintenance-and-feedback"></a>

### 5.4 Maintenance and feedback

See the [README](../README.md#update) for installation, upgrades, adding AI tools, version and health checks, or [uninstallation](../README.md#uninstall) for removal.

For feedback, include versions, actions, expected/actual results and a minimal reproduction. Redact credentials, personal paths and business data before filing an [Issue](https://github.com/clsx/aimship/issues). See [Contributing](../CONTRIBUTING.md) for development and the [CLI document](cli.md) for internal tool protocols.
