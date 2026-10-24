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

In all these situations, the agent preserves the original request and maintains delivery records. Important business, scope, compatibility, cost or data decisions remain yours; routine technical decisions stay within your authorization. An unanswered decision is not treated as approval, and dependent work waits for resolution.

<a id="review"></a>
<a id="review-documents-and-continue"></a>
## 3. Proceed and review

The usual development order is PRD/Scope → technical design → interfaces and independent SQL when applicable → test cases → implementation plan → implementation/review/verification → handoff and acceptance. Prototype, investigation and design-only work keep their agreed endpoint; review-only and verify-only reuse their existing basis.

For each document requiring your review, the agent generates and self-checks it, provides a link, a short summary and the next stage, then waits for your review. Read the document and either request changes or explicitly approve it. Requested edits are revised, self-checked and presented again. Questions, silence and asking to see results do not count as approval.

Your explicit approval is recorded against that document version and automatically starts the next authorized stage; no second start confirmation is needed. If you have explicitly arranged to continue in a new session, the agent saves a handoff first; see [session arrangements](#continue). The chat shows the current stage, pending document, review status and next stage. Document approval is separate from final delivery acceptance.

Authorized implementation, agent reviews, defect repairs and retests can proceed continuously. Each implementation batch is reviewed, followed by overall review and independent verification. New material decisions and production actions still need authorization.

<a id="results"></a>
<a id="3-inspect-progress-and-results"></a>
## 4. Inspect progress and results

Start with the delivery's **`status.md`** for the current stage, pending documents, review status, blockers, next stage and artifact links. Read verification conclusions alongside the tested version, environment and evidence. Checks lacking accounts, tools or environments remain blocked or unexecuted rather than passing.

<a id="delivery-structure"></a>
### Delivery structure and documents

By default, each request has its own delivery directory under `~/Aimship/`, while code stays in its existing repositories.

The tree below lists delivery artifacts and their purposes. Files are generated according to the selected stages and input conditions; unselected stages produce no empty documents. `prd.md` and `scope.md` are alternative requirement entries, not two files required for every delivery.

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

Filenames, outlines and identifier rules come from shared templates. Requirements and acceptance criteria link to implementation tasks, reviews and versioned test cases/results. The [document reference](reference.md) explains exactly when each artifact is produced and what it contains.

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

### The maintainer's session practice

To manage growing context, the maintainer has used the following arrangement of separate sessions (windows):

| Work | Session arrangement |
| --- | --- |
| Requirements / Scope | One session |
| Technical design, SQL and interface documents | One shared session |
| Test-case design | One session |
| Implementation plan | One session |
| Implementation | One session per implementation batch, including that batch's agent review |
| Overall review | One session |
| Test execution | One session per test batch |

This is practical experience, not a required split or a stage completion condition. Adjust it to the task's size, volume of materials and accumulated context. Assess any combined arrangement in actual use. Sharing a session for technical design, SQL and interfaces still requires the agreed document order: review technical design first, then each applicable interface/SQL document individually. A shared window does not bypass approval.

Implementation batches and test batches serve different purposes. Test batches follow the verification arrangement and need not correspond one-to-one with implementation batches; this does not require testing after every implementation batch. A new window alone does not guarantee independent judgment or quality. Each new session still needs the relevant complete formal documents, saved state and actual artifacts, not just a brief chat summary.

### Arrange the next session and hand off

Aimship defines stages, artifacts, reviews and handoffs; it does not create new sessions. When changing windows, open a new session in your AI tool and provide the same delivery directory and handoff information.

If you want to change sessions after approving a document, say so with the approval, for example: “This document is approved. Save the handoff first; I will continue in a new window.” The agent records approval and your continuation arrangement without starting the next stage in the current session. For implementation or test batches, you can instead say: “Finish this batch, save the results and handoff, and leave the next batch for a new session.” This does not add human approval requirements to execution records.

Before ending the current session, have the agent save progress, review status, unresolved issues and the next step, and provide the full delivery directory path and relevant code locations. In the new session, select Aimship and provide the same delivery directory. The agent reads the relevant complete formal documents and state, checks actual artifacts and continues according to the saved arrangement. Ensure that a different tool can access the same materials and code.

Keep only one writing session per delivery; the old session must stop writing before the new one takes over. Pending documents still require your explicit approval, and changing windows cannot bypass review. Progress and next steps remain in the same `status.md`; you do not need to copy the entire chat.

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
See the [delivery document reference](reference.md) for generation conditions, stage outputs, outlines and identifier rules. The agent maintains these as work progresses; you do not need to learn them all before starting.

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
For software upgrades, adding tools, version queries and installation health checks, see the [README](../README.md#update).

<a id="uninstall"></a>
For tool disconnection or full uninstallation, see the [README](../README.md#uninstall). Source development and isolated validation belong in [Contributing](../CONTRIBUTING.md).
