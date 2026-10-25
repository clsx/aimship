# Aimship Guide

[中文](guide.zh-CN.md) · [README](../README.md)

This guide explains what to provide, how the agent proceeds and where to find results in common situations. You do not need to memorize stage names or fixed prompts.

<a id="install"></a>
If Aimship is not installed yet, start with the README's [installation instructions](../README.md#install).

[Select Aimship](#hosts) · [Start from your situation](#start) · [Proceed and review](#review) · [Progress and results](#results) · [Changing requirements](#changes) · [Sessions and continuation](#continue) · [Parallel work](#parallel) · [Complete delivery](#completion) · [Usage problems](#troubleshoot)

<a id="hosts"></a>
<a id="1-select-aimship-in-your-host"></a>
<a id="1-select-aimship-in-your-ai-development-tool"></a>
## 1. Select Aimship in your AI tool

After installation, open a new tool session and select Aimship:

| AI tool | How to select it | If it is missing |
| --- | --- | --- |
| Codex | Choose Aimship in the Skill selector; use `$aimship` in CLI | Start a new conversation or restart the CLI; restart the app if the list is stale |
| Cursor | Use `/aimship` | Start a new agent session and inspect Customize → Skills; restart Cursor if stale |
| Claude Code | Use `/aimship` | Start a new session and inspect the slash-command list; restart Claude Code if stale |

Each tool needs its own login, available model and access to delivery materials and relevant code repositories. Grant access when an operation needs it. Delivery materials are stored separately; code stays in its existing repository.

AI tool integrations are experimental: actual Skill discovery, directory access and continuation across AI tools remain unverified. Healthy installation files do not prove that a tool loaded the Skill. Codex and Cursor share an entry, and compatible tools may discover entries in other locations; inspect paths and versions if duplicates appear, preserving unrelated or customized content. See the official [Cursor documentation](https://cursor.com/docs/skills) and [Codex skill locations](https://learn.chatgpt.com/docs/build-skills) for tool behavior.

<a id="start"></a>
<a id="describe-the-work-and-its-endpoint"></a>
## 2. Start from your current situation

### Starting with an idea

Describe the problem, who it affects, the expected change and known constraints. Include screenshots, discussion notes or references if available; a complete PRD is not required.

The agent clarifies gaps that affect scope and acceptance, organizes requirements, and proposes the stages and execution order. After you confirm the goal and important tradeoffs, work proceeds. Requirements and acceptance criteria are usually recorded in `prd.md`; open `status.md` for current progress.

### Working from an existing PRD, prototype or other materials

Provide material locations, the versions to adopt and relevant code locations. If only part of the material applies, identify that scope. Mention known gaps when materials are incomplete.

The agent checks access and coverage of the delivery goal. When adopting an authoritative PRD or prototype, it preserves the originals and records the adopted scope, gaps and decisions in `scope.md`; scattered references instead inform authored requirements. Covered interactions are reused, with uncovered changes developed as needed. Follow the requirements document and its source links to see what was adopted and which decisions remain.

### Changing a feature, fixing a defect or refactoring

Provide the relevant repository and feature location, expected behavior, current problems and behavior that must be preserved. For a defect, include available reproduction steps, errors or logs; for refactoring, explain the technical goal and external behavior that must remain unchanged.

The agent examines the implementation, confirms requirements and technical constraints, and arranges design, implementation, review and verification. Ordinary debugging stays within the current work; a significant unknown requiring independent investigation leads to an arrangement change. `plan.md` tracks implementation, while `review.md` and `testing.md` record review and actual verification results.

Preserve adopted versions of external material; a URL alone may not retain a version, and access gaps must be explicit. An existing editable PRD may be reused when you explicitly commission its maintenance and it fully states this scope, authorization and endpoint. Earlier authorship alone does not permit changing an adopted original.

In all these situations, the agent preserves the original request and maintains delivery records. Important business, scope, compatibility, cost or data decisions remain yours; routine technical decisions stay within your authorization. An unanswered decision is not treated as approval, and dependent work waits for resolution.

<a id="review"></a>
<a id="review-documents-and-continue"></a>
## 3. Proceed and review

The standard sequence is requirements and acceptance criteria → technical design with applicable interface/SQL/interaction artifacts → test cases → implementation plan → implementation batches with batch review → overall review → verification → delivery acceptance. The agent organizes this sequence without asking you to select every core stage. Unrelated artifacts are not created; existing formal material is inspected before adoption, which does not itself constitute approval.

After drafting and self-checking each document that needs your review, the agent shows the current stage status, document entry and review focus. Explicitly approve it or raise questions. Discussion, silence and requests to see results are not approval; revisions are self-checked and presented again. No next-stage continuation prompt is issued while review is pending.

After explicit approval, the agent records the decision and document version, saves progress and next work, checks the save result, and then suggests the next action in the same handling of your message. You need not separately confirm saving or the prompt; failed saves are reported honestly. Within a suggested session group, the next item starts directly. At a group boundary, the agent suggests a new session and provides a short entry without executing the next group in that response. Say “continue in this session” to proceed without another approval. See [session grouping suggestions](#continue).

If you explicitly exclude test cases and testing, the agent explains and records that scope once, completes the authorized development and review, and hands over an **untested partial result**. It does not quietly add excluded work or repeatedly persuade you. Finishing that scope is not standard complete delivery or a passing verification result. Document approval remains separate from final delivery acceptance.

Authorized implementation, batch checks/repairs and retests can proceed. Review or test findings first lead to repairs or the existing change flow. New material decisions and production actions still need their corresponding authorization.

<a id="results"></a>
<a id="3-inspect-progress-and-results"></a>
## 4. Inspect progress and results

Start with the delivery's **`status.md`** for the current stage, pending documents, review status, blockers, next stage and artifact links. Read verification conclusions alongside the tested version, environment and evidence. Checks lacking accounts, tools or environments remain blocked or unexecuted rather than passing.

<a id="delivery-structure"></a>
### Delivery structure and documents

By default, each request has its own delivery directory under `~/Aimship/`, while code stays in its existing repositories.

The tree below lists delivery artifacts and their purposes. Files follow the agreed delivery scope and actual artifact conditions; unrelated work produces no empty documents. `prd.md` and `scope.md` are alternative requirement entries, not two files required for every delivery.

```text
~/Aimship/
├── 20261023-order-export/         # One request, one delivery folder
│   ├── status.md                 # Generated overview and reading entry
│   ├── prd.md                    # Authored requirements, scope and acceptance
│   ├── scope.md                  # Used instead of PRD when adopting authoritative inputs
│   ├── tech-design.md            # Architecture, changes, data, risks and requirement coverage
│   ├── plan.md                   # Implementation batches, tasks and actual execution
│   ├── testing.md                # Test cases, coverage, runs and retest results
│   ├── review.md                 # Batch/overall reviews, findings and follow-up
│   ├── handoff.md                # Delivered result, usage, validation and remaining work
│   ├── diagnosis.md              # Only for an independent investigation
│   ├── change-log.md             # Meaningful changes, decisions and affected work
│   ├── openapi.yaml              # New HTTP contract; reuse an existing authority when available
│   ├── database.sql              # SQL for one database; multiple targets use database-<id>.sql
│   ├── prototype/                # Newly authored prototypes when required
│   │   └── index.html            # Entry for an HTML prototype; its assets stay here
│   ├── source/                   # Preserved original request and adopted input versions
│   │   ├── request.md            # Original commission or source entry
│   │   └── …                     # External PRD, prototype, screenshots and other inputs
│   └── .aimship/                 # Managed state and supporting evidence
│       ├── state.json            # Stages, references, versions and repository/worktree links
│       ├── state.previous.json   # Previous state for recovery after writes
│       ├── view.json             # Metadata for the generated status view
│       └── evidence/             # Evidence retained when needed
└── 20261024-another-request/      # Independent request and progress
```

Formal documents are directly in the request folder. `source/` preserves adopted originals; `.aimship/` holds internal records. The software itself is installed separately in `~/.aimship/`.

Filenames, outlines and identifier rules come from shared templates. Requirements and acceptance criteria link to implementation tasks, reviews and versioned test cases/results. The [document details](#document-details) explain when each artifact is produced and what it contains.

<a id="changes"></a>
<a id="review-verify-and-change"></a>
<a id="4-requirements-change-during-delivery"></a>
## 5. Requirements change during delivery

Explain what changed, why, and what should remain. If you edited a formal document, identify the location so the agent can reconcile its meaning.

The agent assesses the impact on scope, design, implementation and verification, records decisions, and updates affected documents and work arrangements. It brings necessary tradeoffs to you while other authorized work continues. Adopted originals are preserved.

A material change to an approved document returns it to review and holds dependent work until the review is resolved. Earlier approvals and results remain as history; an old approval cannot authorize the revised content. Work resumes in dependency order after re-review. Unaffected work is retained, and formatting or typo fixes do not require full re-review.

Meaningful changes and their impact are recorded in `change-log.md`; see `status.md` for next steps. Do not edit `status.md` to change requirements or record acceptance: it is a generated view. Any manual edits need preserving before the agent reconciles and regenerates it.

<a id="continue"></a>
<a id="continue-in-another-conversation"></a>
<a id="5-resume-after-a-pause-or-in-another-session"></a>
<a id="6-resume-after-a-pause-or-in-another-session"></a>
## 6. Session arrangements and continuing work

### Session grouping suggestions

The following arrangement is based on experience from actual projects and can be adjusted to task size. At delivery creation or requirements confirmation, the agent records applicable suggested groups in state and shows them in `status.md`:

| Work | Session arrangement |
| --- | --- |
| Requirements / Scope | One session |
| Technical design, SQL and interface documents | One shared session |
| Test-case design | One session |
| Implementation plan | One session |
| Implementation | One session per implementation batch, including that batch's agent review |
| Overall review | One session |
| Test execution | One session per test batch |

This is practical experience, not a required split or a stage completion condition. Adjust it to the task's size, volume of materials and accumulated context. Assess any combined arrangement in actual use. Sharing a session for technical design, SQL and interfaces still requires the agreed document order: review technical design first, then each applicable interface/SQL document individually. A shared session does not bypass approval.

Implementation batches and test batches serve different purposes. Test batches follow the verification arrangement and need not correspond one-to-one with implementation batches; this does not require testing after every implementation batch. A new session alone does not guarantee independent judgment or quality. Each new session still needs the relevant complete formal documents, saved state and actual artifacts, not just a brief chat summary.

### Arrange the next session and hand off

At a suggested boundary, the agent first confirms that approval, results and state were saved, then reports current results and next work, suggests a new session, and provides one copyable entry using the actual delivery directory:

> Use Aimship to continue delivery <actual directory>; first read the current state and relevant formal documents, then continue the recorded work.

You do not need to repeat a session-switch instruction with each approval or separately confirm saving and prompt generation. Say “continue in this session” to proceed. Grouping is a context suggestion, not an approval or blocker. Final handoff has no unnecessary next-stage entry. Ask for a complete prompt when needed; the default is not a long prompt at every stage or a separate prompt/handoff file.

Aimship itself does not create sessions. After the current session confirms saving and stops writing, open a new session in your AI tool, select Aimship and paste the entry. The new session must uniquely locate the same delivery and inspect actual state, document approval versions, relevant complete formal documents, artifacts and unfinished operations before acting. A trustworthy binding avoids repeated path questions; a missing or ambiguous binding requires a directory or candidate selection, never a guessed latest delivery. Saying “continue next stage” or copying an old prompt grants no approval; a pending draft remains pending across sessions.

Keep one writing session per delivery. Code locations and access permissions must remain available; switching sessions cannot bypass reviews or affected-work stops. Progress stays in the same `status.md`, without copying the entire chat.

Official CLI documentation checked on 2026-10-25 describes [`/new`](https://developers.openai.com/codex/cli/slash-commands) for Codex, [`/new-chat`](https://cursor.com/docs/cli/reference/slash-commands) for Cursor CLI, and [`/clear`](https://code.claude.com/docs/en/interactive-mode#command-history) for Claude Code to start a fresh chat/session. Check the command list of your installed CLI version; these are documentation checks, not a claim of testing each tool. They differ from simply redrawing the screen or compacting context. Save and stop the current writer first.

### Handle interruptions and version changes

After an unexpected interruption, have the agent check completed operations before repeating writes or other actions with side effects. If a repository moved, provide its new location so the agent can verify its identity and update the association. State conflicts or progress-view problems need reconciliation or repair, not forced overwrites.

After a software upgrade, an old session may retain old rules. Save work, then have the agent reconcile the current version and delivery records at a stable boundary; start a new session if context cannot refresh reliably. Older delivery formats require explicit migration, rule adoption and document reconciliation before work continues; unknown formats remain read-only. Originals and historical results are preserved without inventing work that was never performed or treating old completion records as approval. The [CLI protocol](cli.md) provides recovery details for the agent.

<a id="parallel"></a>
<a id="work-on-two-requests-at-once"></a>
<a id="6-progress-several-deliveries-at-once"></a>
## 7. Progress several deliveries at once

Use a separate delivery directory for each request, with one writing session per delivery. Tell the agent about known shared code, interfaces, databases or test environments.

While one delivery changes code, another can perform read-only analysis. Before both change the same code, arrange sequential implementation or separate checkouts/worktrees, reusing existing isolation when available. The agent checks overlap against accessible known delivery records and documents coordination in the plan. Unknown or stale records and work outside Aimship limit this check.

Read each delivery's own progress and results. Completing a branch does not complete integration; Aimship provides no global lock, automatic agent scheduling, automatic worktree creation or automatic merge.

<a id="completion"></a>
<a id="decide-when-work-is-done"></a>
<a id="7-complete-a-delivery"></a>
## 8. Complete a delivery

Review artifact locations, usage instructions, review and verification conclusions, remaining issues and next steps in the handoff. Compare them with the original goal when deciding whether to accept the result.

The agent records goal completion, user acceptance, merge and deployment separately. Asking for a preview does not shorten the goal; if you explicitly end early, the handoff preserves the original goal and unfinished work.

Standard complete delivery needs evidence for the main sequence, required document approvals, passing batch/overall reviews, independent verification and final acceptance. `status.md` distinguishes standard completeness from completion of the agreed scope and user acceptance. Tools check records; they cannot independently prove execution or semantic quality. An explicitly limited result can be finished and handed over as partial scope; untested work is labeled untested. Historical outcomes and acceptance remain intact, initially unassessed under the new standard. Inspect evidence and explicitly adopt the new rules before continuing, without inventing historical approvals or tests.

Small later corrections can continue the same delivery while preserving its earlier completion record. A new goal or substantial redesign starts a related delivery.

<a id="troubleshoot"></a>
<a id="8-problems-during-use"></a>
## 9. Problems during use

| Situation | What to do |
| --- | --- |
| Materials or code cannot be accessed | Grant the required directory access in the current tool and identify the failed operation; do not move materials to bypass restrictions |
| The progress page differs from actual results | Have the agent inspect current records and files, preserve manual edits and regenerate the progress page |
| A formal document changed outside the session | Identify the changes and have the agent assess their meaning and effect on subsequent work |
| An old delivery cannot continue | Have the agent check format migration, rule adoption and document reconciliation, preserving historical results and explaining blockers |
| Aimship is missing, or installation/version problems occur | See [installation and upgrade problems](../README.md#installation-troubleshooting) in the README |

For a bug report, include the tool and Aimship versions, the operation, expected and actual results, and minimal reproducible materials. Redact credentials, personal paths and business data before submitting to [GitHub Issues](https://github.com/clsx/aimship/issues).

## Related references

<a id="artifacts"></a>
<a id="keep-only-useful-artifacts"></a>
See the [document details](#document-details) for generation conditions, stage outputs, outlines and identifier rules. The agent maintains these as work progresses; you do not need to learn them all before starting.

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
For software upgrades, adding tools, version queries and installation health checks, see the [README](../README.md#update).

<a id="uninstall"></a>
For tool disconnection or full uninstallation, see the [README](../README.md#uninstall). Source development and isolated validation belong in [Contributing](../CONTRIBUTING.md).

<a id="document-details"></a>
## Appendix: document details

Use the preceding sections for everyday work. This appendix covers stage outputs, SQL and traceability; file locations follow the [delivery directory](#delivery-structure).

<a id="choose-the-requirement-authority"></a>
See [starting work](#start) for source adoption. PRD and Scope are alternative requirement authorities, not duplicate documents to create by default.

<a id="stage-outputs-and-content"></a>
### Stage outputs

This is an internal responsibility/file mapping for understanding artifacts, not a menu of arbitrary stages to select. See [progress and review](#review) for the standard sequence and limited scope. Sharing plan/testing does not complete stages together, and file existence does not establish completion.

| Stage | When used | Output and content |
| --- | --- | --- |
| `frame` | The problem or intended result needs clarification | Goal/background section of PRD/Scope: problem, outcome, non-goals and assumptions |
| `requirements` | Requirements need authoring or adoption | `prd.md`: goals, scope, requirements, states, acceptance and arrangement; or `scope.md`: source adoption, scope, exclusions, decisions, acceptance and arrangement |
| `scope` | Commission boundaries need explicit resolution | Update PRD scope or Scope goals/boundaries; no second requirements document |
| `prototype` | Required interaction changes are not covered by existing material | New HTML at `prototype/index.html` with related assets; other agreed formats or reused entries are registered |
| `diagnose` | An independent investigation is explicitly arranged | `diagnosis.md`: goal, symptoms, environment, evidence, causes, unknowns and conclusion |
| `tech-design` | Technical solution needs designing | `tech-design.md`: basis, architecture, modules, data/contracts, errors, risks and requirement coverage; SQL is produced and reviewed in contract after this design is approved |
| `contract` | Interfaces or database changes need formal artifacts | HTTP: `openapi.yaml` or the registered authority; agreed non-HTTP format; independent SQL per target, reviewed individually |
| `test-design` | Test cases need authoring | `testing.md`: basis, environment, cases/assertions and requirement/acceptance coverage |
| `plan` | Before any implementation, including one small batch | `plan.md`: basis, batches, tasks, validation approach, execution section and remaining work |
| `implement` | Execute the accepted plan | Code in its repositories; actual task status, objects and deviations in the same `plan.md` |
| `review` | Review a batch, the integrated result or a review-only commission | `review.md`: review basis, each review's scope/findings/resolution and conclusion |
| `verify` | Execute versioned cases after the required review, or a verification-only commission | Append execution batches/RUNs, actual results/evidence, retests and conclusion to the same `testing.md` |
| `handoff` | Deliver the agreed endpoint | `handoff.md`: goal, artifacts, usage, review/verification results, limits and completion/acceptance/integration outcomes |

<a id="sql-changes-and-progress"></a>
### SQL and engineering versions

SQL identifies the target, dialect, version/schema basis and execution conditions, and links ordered statements to requirements/design. It is prepared and individually reviewed in contract after technical design approval and before test cases. A Markdown SQL snippet or migration reference does not replace this deliverable. Generating SQL does not authorize executing it or changing a repository's migration mechanism.

Existing engineering HTTP contracts remain authoritative; avoid a second competing copy. Project current and target versions are recorded in PRD/Scope with their engineering source and observation basis; an unspecified version remains unspecified. `plan.md` records actual changes, while review and test results identify the exact commit/build or uncommitted content. Each repository has its own version and object references. These differ from Aimship’s rules version, state schema and save revision. The handoff records final code objects and actual merge/release status; a target version does not establish publication.

<a id="fixed-outlines-and-traceable-identifiers"></a>
### Outlines and traceable identifiers

New documents follow [shared templates and rules](../skills/aimship/references/document-patterns.md). Section order and stable anchors are retained; visible headings can be translated. Inapplicable sections explain why. Short tasks use the same outline, with shorter content. Unselected stages do not produce empty documents, and there is no arbitrary small-task merging.

| Identifier | Meaning |
| --- | --- |
| `REQ-001`, `AC-001` | Requirement and acceptance criterion |
| `B-001`, `TASK-001` | Implementation batch and task |
| `PAGE-001`, `Q-001` | Prototype page and tracked question |
| `TC-001`, `RUN-001` | Test case and actual verification run |
| `REV-001`, `CHG-001` | Review and meaningful change |

Each series starts at `001` and advances beyond its historical maximum, including retired items; three digits are the minimum width. An ID is never reused for a different obligation. Within a namespace and version, an identity has one effective definition; other documents reference it. Classification or layout changes retain the ID, while splits/merges create new IDs linked to the originals.

References connect requirements/acceptance to design, tasks, code objects, reviews, case versions and actual runs. These relationships may be many-to-many: `REQ-001` and `TC-001` are not related merely because their numbers match. Shared rules, permissions and quality requirements receive independent identities when independently testable. External IDs retain their spelling and source/version namespace; sources without IDs receive local mappings to their original locations. Changed case meaning gets a new version; earlier failures and their case/code versions remain traceable.

For example: `REQ-001 → AC-002 → TC-004@1 → RUN-003` records the explicit requirement-to-result relationship. A RUN also identifies the tested code/build and evidence; the case ID alone does not prove execution.

The tools check structure, references and basic coverage. The agent must still assess whether the content and assertions actually satisfy the requirement; valid metadata alone is not proof.
