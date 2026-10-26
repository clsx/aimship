# Aimship Guide

[中文](guide.zh-CN.md) · [README](../README.md)

For your first delivery, start with module 1. For an existing delivery, go to 2.1. Other scenarios and reference material are in modules 3 and 4.

[1. Start and proceed](#start) · [2. Sessions, progress and acceptance](#continue) · [3. Other starting points and work arrangements](#scenarios) · [4. Problems and references](#troubleshoot)

<a id="start"></a>
<a id="choose-the-requirement-authority"></a>
<a id="describe-the-work-and-its-endpoint"></a>
<a id="2-start-in-different-scenarios"></a>
<a id="1-first-use"></a>
## 1. Start and proceed

<a id="install"></a>
Before starting, follow the README's [installation instructions](../README.md#install) for your AI tool. Installation requires Node.js 22+ and npm; your AI tool needs a login and an available model.

<a id="prepare-a-workspace"></a>
### 1.1 Prepare a workspace

- **With an existing project:** reuse the accessible project workspace and leave code in its current location.
- **Without code:** begin with requirements. Choose a workspace that can hold delivery materials; a code repository is not required.

Delivery materials default to `~/Aimship/`, with a separate directory for each delivery. An alternative root configured during installation remains in use. Keep materials separate from code. You can specify a materials location with your request; the agent checks it and reports the actual delivery directory.

Installation does not create delivery materials or grant directory access. If the target is missing or inaccessible, the agent names the path and required action: use your tool's actual facilities to open an existing parent, or create and open the target directory, then provide the needed access. Reuse an accessible workspace when available.

<a id="hosts"></a>
<a id="1-select-aimship-in-your-host"></a>
<a id="1-select-aimship-in-your-ai-development-tool"></a>
<a id="1-select-aimship-in-your-ai-tool"></a>
<a id="activate-aimship-and-describe-the-request"></a>
### 1.2 Activate Aimship and describe the request

After installation, open a new session and explicitly select Aimship through the appropriate entry:

| AI tool | How to select it | If it is missing |
| --- | --- | --- |
| Codex | Choose Aimship in the Skill selector; use `$aimship` in CLI | Start a new conversation or restart the CLI; restart the app if the list is stale |
| Cursor | Use `/aimship` | Start a new agent session and inspect Customize → Skills; restart Cursor if stale |
| Claude Code | Use `/aimship` | Start a new session and inspect the slash-command list; restart Claude Code if stale |

After selecting the entry, describe the concrete problem, intended change and known constraints. You can also explicitly say “use Aimship” in the request; loading still depends on the AI tool discovering the installed entry.

<a id="starting-without-a-requirements-document"></a>

> Use Aimship to add an export of the currently filtered orders. First clarify the fields; code will be prepared later.

A complete PRD, code and settled technical conditions are not prerequisites. A broad direction such as “build an order system” prompts clarification of the actual problem first. Include available materials; unsettled delivery endpoints and technical conditions remain open questions.

<a id="check-the-saved-result-and-answer-necessary-questions"></a>
### 1.3 Check the saved result and answer necessary questions

After saving, the agent reports:

- The actual delivery directory and its `status.md` entry;
- The saved request and current stage or work;
- Information needed next or the work that will follow.

The receipt also identifies the Aimship version and any associated code. The original request is saved in `source/request.md`. Once substantive requirements are drafted, the agent provides `prd.md`, or `scope.md` when adopting existing materials. If saving is not yet possible, it explains why and what action is needed.

Answer questions affecting scope and acceptance. For example: “Export order ID, amount and status, preserving the current filter and sort order.” When the requirements document is ready, open and review it as described next; initialization does not approve the requirements.

<a id="review"></a>
<a id="review-documents-and-continue"></a>
<a id="3-proceed-and-review"></a>
<a id="2-review-and-proceed"></a>

<a id="read-the-document-and-give-a-decision"></a>
### 1.4 Read the document and give a decision

After self-checking each document that needs human review, the agent provides its current status, a document entry and review focus. Open it and check the goal, scope, acceptance criteria and tradeoffs requiring your decision.

To approve the current version, say explicitly:

> This requirements document is approved.

To request a revision, identify the content:

> The export should include orders with an empty status. Add that acceptance criterion and return the document for review.

The agent revises, self-checks and presents the document again. You decide important business, scope, compatibility, cost and data matters; the agent handles routine technical choices within your authorization. Discussion and open decisions retain the review stop.

<a id="continue-after-approval"></a>
### 1.5 Continue after approval

After explicit approval, the agent saves the reviewed version's approval, progress and next action. Work continues within the suggested session group. At a group boundary, it reports the completed work and gives a [new-session continuation entry](#continue). Say “continue in this session” to stay in the current conversation.

The standard sequence is requirements and acceptance criteria → technical design with applicable interface/SQL/interaction artifacts → test cases → implementation plan → implementation batches with batch review → overall review → verification → delivery acceptance. The agent organizes this sequence and creates documents as needed; existing materials are checked for adoption and receive the applicable reviews.

Review or test findings lead to authorized repairs, re-review or retesting. New material decisions and production actions require corresponding authorization. If you explicitly exclude test cases and testing, the agent explains and records that scope, completes the authorized work and hands over an untested partial result.

<a id="5-requirements-change-during-delivery"></a>
<a id="changes"></a>
<a id="review-verify-and-change"></a>
<a id="4-requirements-change-during-delivery"></a>
<a id="changing-approved-requirements"></a>
### 1.6 Changing approved requirements

Explain what changed, why, and what should remain. If you edited a formal document, identify the location so the agent can reconcile its meaning.

The agent assesses the impact on scope, design, implementation and verification, records decisions, and updates affected documents and work arrangements. It brings necessary tradeoffs to you while other authorized work continues. Adopted originals are preserved.

A material change to an approved document returns it to review and holds dependent work until the review is resolved. Earlier approvals and results remain as history; an old approval cannot authorize the revised content. Work resumes in dependency order after re-review. Unaffected work is retained, and formatting or typo fixes do not require full re-review.

Meaningful changes and their impact are recorded in `change-log.md`; see `status.md` for next steps. Do not edit `status.md` to change requirements or record acceptance: it is a generated view. Any manual edits need preserving before the agent reconciles and regenerates it.

<a id="continue"></a>
<a id="continue-in-another-conversation"></a>
<a id="5-resume-after-a-pause-or-in-another-session"></a>
<a id="6-resume-after-a-pause-or-in-another-session"></a>
<a id="6-session-arrangements-and-continuing-work"></a>
<a id="continuing-an-existing-delivery-or-switching-sessions"></a>
<a id="3-continue-next-time"></a>
## 2. Sessions, progress and acceptance

<a id="arrange-the-next-session-and-hand-off"></a>
<a id="resume-in-a-new-session"></a>
### 2.1 Resume in a new session

1. Wait for the current session to confirm that documents, approvals and progress are saved, and to stop writing.
2. Open a new session in your AI tool and explicitly select Aimship again.
3. Paste the agent's continuation entry, using the actual directory from the receipt:

> Use Aimship to continue the delivery at “actual delivery directory”. Read its current state and relevant formal documents before proceeding.

The agent reads the same delivery's saved state, relevant formal documents and results, then reports the current stop and next action. A trusted binding can identify the delivery directly; missing or ambiguous matches prompt a directory question. Pending documents still need review; switching sessions does not grant approval.

Keep one writing session per delivery, with access to its materials and code. Aimship supplies the entry; you create the session. Usually, you need not copy the whole chat. If a session switch is necessary before the first save, carry over the agent's summary of the unsaved request, intended location and pending operation.

<a id="continue-after-work-stops-unexpectedly"></a>
### 2.2 Continue after work stops unexpectedly

Provide the original delivery directory, the interrupted operation and any errors. The agent checks actual files, saved progress and unfinished operations before continuing. Interrupted initialization or a failed progress view after saving is repaired while preserving existing identity and materials.

If a repository moved, provide its new location for identity verification and association updates. State conflicts need reconciliation; manual progress-page edits are preserved before inspection and regeneration.

<a id="session-grouping-suggestions"></a>
### 2.3 Session grouping suggestions

The agent suggests groups for applicable work and shows them in `status.md`. Adjust them to task size, material volume and accumulated context.

| Work | Session arrangement |
| --- | --- |
| Requirements / Scope | One session |
| Technical design, SQL and interface documents | One shared session |
| Test-case design | One session |
| Implementation plan | One session |
| Implementation | One session per implementation batch, including that batch's agent review |
| Overall review | One session |
| Test execution | One session per test batch |

Grouping manages context; it is not an additional approval or completion condition. Shared sessions still review documents individually in order. Implementation and test batches need not correspond one-to-one, and immediate testing after every implementation batch is not required. A new session must read complete relevant materials rather than rely only on a chat summary.

<a id="results"></a>
<a id="3-inspect-progress-and-results"></a>
<a id="4-inspect-progress-and-results"></a>
<a id="4-inspect-progress-and-accept-results"></a>

<a id="check-current-work"></a>
### 2.4 Check current work

Open **`status.md`** from the receipt for the current stage, pending documents, blockers, next action and artifact entries. You can also ask:

> Where does this delivery stand, and what still needs my decision?

Read verification conclusions alongside the tested version, environment and evidence. Checks lacking prerequisites remain blocked or unexecuted. See [delivery structure and documents](#delivery-structure) for file purposes. The agent maintains `status.md`; state requirement changes or acceptance decisions in the conversation.

<a id="completion"></a>
<a id="decide-when-work-is-done"></a>
<a id="7-complete-a-delivery"></a>
<a id="8-complete-a-delivery"></a>
<a id="accept-the-delivered-result"></a>
### 2.5 Accept the delivered result

Read `handoff.md` for artifact locations, usage, review and verification conclusions, and remaining issues. Compare the result with the original goal. You can explicitly say:

> I have checked the order export result. It meets the agreed goal, and I accept this delivery.

If it differs, describe the observed and expected behavior so the agent can address it and update the result. Document approval and final acceptance are recorded separately, as are goal completion, user acceptance, merge and deployment.

Standard complete delivery needs evidence for the main sequence, required approvals, passing batch/overall review, independent verification and final acceptance. Explicitly limited or untested results retain their stated limitations. Older deliveries preserve historical records, with assessment under the current standard reported separately. A preview request does not change the goal; an explicit early stop retains unfinished work.

Small later corrections can continue the original delivery while preserving its earlier completion record. A new goal or substantial redesign starts a related delivery.

<a id="scenarios"></a>
<a id="5-other-starting-points-and-work-arrangements"></a>
## 3. Other starting points and work arrangements

These situations follow the same first-use and review flow, with the additional materials or arrangements below.

<a id="working-from-an-existing-prd-prototype-or-other-materials"></a>
### 3.1 Working from an existing PRD, prototype or other materials

Provide material locations, the versions to adopt, the scope of this delivery and any known gaps.

> Use Aimship to deliver order export from this PRD and prototype. Adopt only the “Export orders” section for this delivery.

The agent checks access and coverage, preserves authoritative originals, and records adopted content, gaps and decisions in `scope.md`; scattered references inform authored requirements. Covered interactions are reused, with uncovered changes developed as needed.

Retain the adopted version of external material. To maintain an existing editable PRD directly, explicitly commission that work and confirm that it fully states this scope, authorization and endpoint.

<a id="changing-a-feature-fixing-a-defect-or-refactoring"></a>
### 3.2 Changing a feature, fixing a defect or refactoring

Provide the repository and feature location, expected behavior and behavior to preserve. Include reproduction steps or logs for defects, or the technical goal for refactoring.

> Use Aimship to fix missing selected records in order exports. The repository is at “local checkout directory”; reproduction steps follow…

The agent may read relevant code during requirements to check existing behavior and technical constraints, then arrange design, implementation, review and verification. `plan.md`, `review.md` and `testing.md` record implementation progress, review and actual verification results respectively.

<a id="turning-the-current-discussion-into-a-delivery"></a>
### 3.3 Turning the current discussion into a delivery

Once a discussion contains a concrete request, explicitly ask Aimship to take it forward.

> Use Aimship for the order export request we just discussed. Preserve the confirmed fields and open decisions.

The agent reuses relevant visible input, preserving original wording, confirmed decisions and open questions; unavailable history is identified as a gap. If a new session is needed before saving, carry over the unsaved context and intended materials location, then activate Aimship again.

<a id="associating-code-after-requirements-have-started"></a>
### 3.4 Associating code after requirements have started

When code is ready, provide an accessible local checkout within the original delivery.

> Associate “local checkout directory” with the current order export delivery and check how the implementation affects the requirements.

The agent associates the code with the same delivery and reads necessary engineering facts; the materials directory stays the same. Association itself does not modify code. New facts affecting confirmed content follow [requirement changes](#changes), and implementation retains its existing review and authorization requirements.

<a id="7-progress-several-deliveries-at-once"></a>
<a id="parallel"></a>
<a id="work-on-two-requests-at-once"></a>
<a id="6-progress-several-deliveries-at-once"></a>
<a id="progress-several-deliveries-at-once"></a>
### 3.5 Progress several deliveries at once

Use a separate delivery directory for each request, with one writing session per delivery. Tell the agent about known shared code, interfaces, databases or test environments.

While one delivery changes code, another can perform read-only analysis. Before both change the same code, arrange sequential implementation or separate checkouts/worktrees, reusing existing isolation when available. The agent checks overlap against accessible known delivery records and documents coordination in the plan. Unknown or stale records and work outside Aimship limit this check.

Read each delivery's own progress and results. Completing a branch does not complete integration; Aimship provides no global lock, automatic agent scheduling, automatic worktree creation or automatic merge.

<a id="troubleshoot"></a>
<a id="8-problems-during-use"></a>
<a id="9-problems-during-use"></a>
<a id="6-problems-and-references"></a>
## 4. Problems and references

### 4.1 Common problems

| Situation | What to do |
| --- | --- |
| Materials or code cannot be accessed | Grant the required directory access in the current tool and identify the failed operation; do not move materials to bypass restrictions |
| The progress page differs from actual results | Have the agent inspect current records and files, preserve manual edits and regenerate the progress page |
| A formal document changed outside the session | Identify the changes and have the agent assess their meaning and effect on subsequent work |
| An old delivery cannot continue | Have the agent check format migration, rule adoption and document reconciliation, preserving historical results and explaining blockers |
| Aimship is missing, or installation/version problems occur | See [installation and upgrade problems](../README.md#installation-troubleshooting) in the README |

For a bug report, include the tool and Aimship versions, the operation, expected and actual results, and minimal reproducible materials. Redact credentials, personal paths and business data before submitting to [GitHub Issues](https://github.com/clsx/aimship/issues).

<a id="continue-an-existing-delivery-after-upgrading-aimship"></a>
### 4.2 Continue an existing delivery after upgrading Aimship

After upgrading Aimship, an old session may retain old rules. Save work, then have the agent reconcile the current version and delivery records at a stable boundary; start a new session if context cannot refresh reliably. Older delivery formats require explicit migration, rule adoption and document reconciliation before work continues; unknown formats remain read-only. Originals and historical results are preserved without inventing work that was never performed or treating old completion records as approval. The [CLI protocol](cli.md) provides recovery details for the agent.

<a id="ai-tool-integration-notes"></a>
### 4.3 AI tool integration notes

AI tool integrations are experimental: actual Skill discovery, directory access and continuation across AI tools remain unverified. Healthy installation files do not prove that a tool loaded the Skill. Codex and Cursor share an entry, and compatible tools may discover entries in other locations; inspect paths and versions if duplicates appear, preserving unrelated or customized content. See the official [Cursor documentation](https://cursor.com/docs/skills) and [Codex skill locations](https://learn.chatgpt.com/docs/build-skills) for tool behavior.

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
### 4.4 Delivery structure and documents

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

<a id="fixed-outlines-and-traceable-identifiers"></a>
The agent maintains links between requirements, acceptance criteria, implementation tasks, reviews and test results for traceability.

<a id="installation-and-maintenance-references"></a>
### 4.5 Installation and maintenance references

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
For software upgrades, adding tools, version queries and installation health checks, see the [README](../README.md#update).

<a id="uninstall"></a>
For tool disconnection or full uninstallation, see the [README](../README.md#uninstall). Source development and isolated validation belong in [Contributing](../CONTRIBUTING.md).
