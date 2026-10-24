# Aimship Guide

[中文](guide.zh-CN.md) · [README](../README.md)

This guide covers installation, use and maintenance. Delivery goals and relevant materials form the workflow inputs; the agent maintains delivery records as work progresses.

[Install](#install) · [Host setup](#hosts) · [Start](#start) · [Documents and stages](#artifacts) · [Review and changes](#changes) · [Continue](#continue) · [Parallel work](#parallel) · [Update](#update) · [Uninstall](#uninstall) · [Troubleshoot](#troubleshoot) · [Completion](#completion)

<a id="install"></a>
## 1. Install Aimship

Requires **Node.js 22+ and npm**. Installation and tool behavior have been checked on macOS arm64 with Node 24 and 26; Node 22 and other operating systems remain unverified. Command examples use a POSIX shell.

### Published preview

```sh
npx aimship@preview install --host codex
```

Choose `codex`, `cursor` or `claude-code`. To connect several hosts, repeat the option:

```sh
npx aimship@preview install --host codex --host claude-code
```

Confirm npm's package installation prompt. `@preview` selects the published preview channel; an exact published version, such as `@0.1.0-preview.7`, can be used instead. The preview channel is experimental and does not imply a stable release.

### Source or local package

From the Aimship source checkout:

```sh
node bin/aimship.mjs install --host codex
```

For a supplied tarball, replace `VERSION` with its actual version and run from the directory containing it:

```sh
npx --offline file:./aimship-VERSION.tgz install --host codex
```

These are alternative ways to run the same installer. No global npm install or administrator privilege is required. A local tarball requires a writable npm cache but no npm login. Use your real home only when you intend to install there.

### Installation and delivery locations

| Location | Purpose |
| --- | --- |
| `~/.aimship/` | Fixed software releases, configuration and custom content |
| `~/.aimship/bin/aimship.mjs` | Stable launcher for the active installed release |
| `~/Aimship/<request>/` | One delivery's documents and internal `.aimship/` records |
| Your existing repositories | Code, branches and worktrees; linked from delivery state |

Installation does not create a delivery or move code. Select an initial material root with `--data-root` if needed; later installs retain existing configuration. There is no language setting or per-project installation. The installer keeps the active release and at most one ordinary recovery release, preserving changed or unowned files.

For an isolated trial, place the supplied tarball in the current directory, replace `VERSION`, then run:

```sh
trial=$(mktemp -d)
trial=$(cd "$trial" && pwd -P)
npx --yes --offline --cache "$trial/npm-cache" file:./aimship-VERSION.tgz install --home "$trial/home" --host codex
node "$trial/home/.aimship/bin/aimship.mjs" --version
node "$trial/home/.aimship/bin/aimship.mjs" status
node "$trial/home/.aimship/bin/aimship.mjs" install --host cursor
node "$trial/home/.aimship/bin/aimship.mjs" uninstall --host cursor
node "$trial/home/.aimship/bin/aimship.mjs" uninstall
```

`--home` redirects managed installation files; it does not make your running host discover that home or inherit permissions. The installed launcher defaults subsequent operations to its own installation home. Remove the disposable directory after inspection if desired; do not replace it with a real home.

<a id="hosts"></a>
## 2. Select Aimship in your host

| Host | Managed entry | Explicit use | Reload after installation or changes |
| --- | --- | --- | --- |
| Codex | `~/.agents/skills/aimship/` | Select Aimship; `$aimship` in CLI | Start a new conversation or restart the CLI; check the actual skill selector. Restart the app if stale. |
| Cursor | Same `.agents/skills/aimship/` entry | `/aimship` | Start a new agent session and inspect Customize → Skills; restart if stale. |
| Claude Code | `~/.claude/skills/aimship/` | `/aimship` | Start a new session and inspect slash-command discovery; restart if stale. |

Host integrations are experimental. Actual end-to-end discovery, directory access and cross-host continuation still require validation. Each host needs its own login, model availability and permission to access the relevant material and code roots. An installation file check is not proof that the host loaded the Skill. No cloud synchronization is enabled.

Codex and Cursor share a managed entry. Compatible hosts may also discover entries outside their primary location, so registration and discovery are different. Inspect paths and versions if duplicates appear; preserve unrelated or customized entries. See the official [Cursor documentation](https://cursor.com/docs/skills) and [Codex skill locations](https://learn.chatgpt.com/docs/build-skills).

Add a host using the already installed version, and inspect installation health:

```sh
node "$HOME/.aimship/bin/aimship.mjs" install --host cursor
node "$HOME/.aimship/bin/aimship.mjs" --version
node "$HOME/.aimship/bin/aimship.mjs" status
```

The CLI `status` command reports installation health. A delivery's `status.md` reports its work progress. They serve different purposes.

<a id="start"></a>
<a id="describe-the-work-and-its-endpoint"></a>
## 3. Delivery goals and authorization

A delivery request should specify the expected outputs, input and code locations, and authorization boundaries. A complete PRD is not required in advance:

> Use Aimship to add order export. Use the existing app repository and these screenshots. Complete implementation, review and verification; leave deployment for later.

> Use Aimship to assess the notification preferences feature. Produce requirements, a prototype and a technical design. Stop before implementation.

The agent preserves the original commission in `source/request.md`, chooses the requirement authority and proposes the required stages and their order. Once accepted, that arrangement governs execution. Important business, scope, compatibility, cost or data decisions come back to you; routine engineering decisions stay within your authorization. Silence does not approve an unanswered proposal.

A design-only task may need no writable code repository. The delivery directory need not be the host's main workspace: grant access when an actual operation needs it. The agent must not silently move materials to bypass access restrictions.

<a id="artifacts"></a>
<a id="keep-only-useful-artifacts"></a>
## 4. Documents, stages and generation rules

Use the [annotated directory tree](../README.md#delivery-structure-and-documents) as the layout reference. Formal documents are directly in the request directory, new prototypes in `prototype/`, preserved inputs in `source/`, and machine records/evidence in `.aimship/`. There is no extra `docs/` or `sql/` layer within a delivery.

### Choose the requirement authority

| Input condition | Requirement document | Prototype handling |
| --- | --- | --- |
| An authoritative PRD/prototype is supplied for adoption | `scope.md` records adopted versions, scope, gaps, decisions and acceptance; originals remain unchanged | Reuse covered interactions; create a prototype for uncovered interaction changes within the commissioned endpoint |
| An idea, discussion, screenshots or scattered references | Author `prd.md`, including scope and acceptance | Create a prototype when the commissioned work changes interactions and existing material does not cover them |
| Technical refactoring or a known-cause fix | Author `prd.md` describing the technical goal, boundaries, behavior constraints and acceptance | No prototype when there is no interaction change |
| Independent investigation, review-only or verification-only | PRD/Scope defines that commission and its endpoint | Do not invent a future implementation or prototype |

`prd.md` and `scope.md` are alternatives for the requirement authority, not duplicate descriptions to create together. If you explicitly commission maintenance of an existing editable authoritative PRD and it fully expresses this delivery's scope, authorization and endpoint, register and reuse it. Earlier authorship alone does not make adopted material editable.

Preserve incoming versions in `source/`, including externally supplied PRDs, prototypes and images. Generated formal documents stay in the locations above. External originals are not rewritten when requirements change. A URL alone may not preserve a version; the agent records the available source/version and any access gaps. Reading text, inspecting a visual, interacting with a prototype and editing its original format are distinct capabilities.

### Stage outputs and content

Stage names are stable identifiers. This table is a catalog, not a fixed sequence; the accepted arrangement selects stages and dependencies. Every delivery retains the original request, a requirement/scope authority and state records, even when no separate requirements stage is needed. Sharing `plan.md` or `testing.md` does not complete both stages automatically: each stage retains its own status and result. Documents are drafted when their stage begins, and file creation alone does not establish completion.

| Stage | When used | Output and content |
| --- | --- | --- |
| `frame` | The problem or intended result needs clarification | Goal/background section of PRD/Scope: problem, outcome, non-goals and assumptions |
| `requirements` | Requirements need authoring or adoption | `prd.md`: goals, scope, requirements, states, acceptance and arrangement; or `scope.md`: source adoption, scope, exclusions, decisions, acceptance and arrangement |
| `scope` | Commission boundaries need explicit resolution | Update PRD scope or Scope goals/boundaries; no second requirements document |
| `prototype` | Required interaction changes are not covered by existing material | New HTML at `prototype/index.html` with related assets; other agreed formats or reused entries are registered |
| `diagnose` | An independent investigation is explicitly arranged | `diagnosis.md`: goal, symptoms, environment, evidence, causes, unknowns and conclusion |
| `tech-design` | Technical solution needs designing | `tech-design.md`: basis, architecture, modules, data/contracts, errors, risks and requirement coverage; required SQL is ready before this stage finishes |
| `contract` | A contract needs creating or changing | HTTP: `openapi.yaml` or the registered engineering authority; record an agreed format for non-HTTP contracts |
| `plan` | Before any implementation, including one small batch | `plan.md`: basis, batches, tasks, validation approach, execution section and remaining work |
| `test-design` | Test cases need authoring | `testing.md`: basis, environment, cases/assertions and requirement/acceptance coverage |
| `implement` | Execute the accepted plan | Code in its repositories; actual task status, objects and deviations in the same `plan.md` |
| `review` | Review a batch, the integrated result or a review-only commission | `review.md`: review basis, each review's scope/findings/resolution and conclusion |
| `verify` | Execute versioned cases after the required review, or a verification-only commission | Append execution batches/RUNs, actual results/evidence, retests and conclusion to the same `testing.md` |
| `handoff` | Deliver the agreed endpoint | `handoff.md`: goal, artifacts, usage, review/verification results, limits and completion/acceptance/integration outcomes |

During development, `plan` completes before the first implementation. Each implementation batch is reviewed, followed by overall review and independent verification. Test code can be authored during implementation; there is no full testing gate imposed after each batch. For one batch, one review may cover both batch and overall scope if explicitly recorded. Verification-only work may adopt existing versioned cases without claiming to have executed `test-design`.

Ordinary debugging and known-cause bugs do not add `diagnose`. Fix implementation defects in implementation, design errors in technical design, requirement gaps in PRD/Scope, and incorrect expectations in versioned cases. A major unknown requiring separate investigation needs a recorded stage adjustment; dependent work waits.

### SQL, changes and progress

| Artifact | Generation rule and content |
| --- | --- |
| `database.sql` | Required when database structures or data change; one database target uses this single root-level file |
| `database-<id>.sql` | Multiple independent database targets get one file each; use a stable target ID |
| `change-log.md` | Record meaningful changes: reason, old/new meaning, decision, affected documents/work and remaining actions |
| `status.md` | Generated reading entry: goal, progress, blockers, next action and document links |
| `.aimship/state.json` | Managed state: goal/stages, document references, version binding and associated repositories/worktrees/code locations |

SQL identifies the target, dialect, version/schema basis and execution conditions, and links ordered statements to requirements/design. It is prepared before technical design completes. A Markdown SQL snippet or migration reference does not replace this deliverable. Generating SQL does not authorize executing it or changing a repository's migration mechanism.

Existing engineering HTTP contracts remain authoritative; avoid a second competing copy. Project current and target versions are recorded in PRD/Scope with their engineering source and observation basis; an unspecified version remains unspecified. `plan.md` records actual changes, while review and test results identify the exact commit/build or uncommitted content. Each repository has its own version and object references. These differ from Aimship’s rules version, state schema and save revision. The handoff records final code objects and actual merge/release status; a target version does not establish publication.

### Fixed outlines and traceable identifiers

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

<a id="changes"></a>
<a id="review-verify-and-change"></a>
## 5. Results and change management

Start with `status.md`, then follow the relevant links. Review records assess the change; verification records show executed assertions. Each result identifies the actual object/version, scope, executor, environment and evidence. Missing accounts, tools or environments remain blocked or unexecuted checks with a next action, never passing tests.

For a meaningful change, the agent records the decision once, updates the affected editable requirements/design/contracts/SQL/cases and rechecks affected conclusions. Original sources and historical results stay preserved. Unrelated completed work is not reset, and implementation failures are not hidden by weakening acceptance criteria.

Tell the agent about a change, or edit the relevant formal document and ask it to reconcile the change. `status.md` is a generated view; manual edits do not change the goal or confer acceptance. Preserve any such edits before requesting regeneration. Internal JSON and view metadata are tool-managed.

<a id="continue"></a>
<a id="continue-in-another-conversation"></a>
## 6. Progress checkpoints and session continuation

At a stable stage or batch boundary, ask the agent to save progress and provide a continuation prompt with the absolute delivery path. Open the next conversation yourself and select Aimship:

> Use Aimship to continue the delivery at `/absolute/path/to/Aimship/20261023-order-export/`. Read its state and current documents, then continue the recorded next step.

Use that same directory when changing hosts; authorize access separately. The new conversation reads current state and relevant inputs, without requiring the entire chat or repeating every test. There is no automatic session creation or cloud synchronization.

If a code repository moved, give its new location; identity must be checked before repairing the reference. After an interruption, inspect actual artifacts and side effects before retrying. Revision conflicts need reconciliation rather than force-overwriting. Read/check/resume report stale or modified views; explicit render regenerates them after preserving manual changes. A saved state with a failed view needs view repair, not replay of the successful state write.

<a id="parallel"></a>
<a id="work-on-two-requests-at-once"></a>
## 7. Parallel deliveries

Keep separate delivery directories, for example `~/Aimship/notification-preferences/` and `~/Aimship/order-export/`, with one writing session per delivery. Code may live in different repositories or the same repository.

If A is implementing in an app checkout, B can still design using it as a read-only reference. Before B also writes code, use sequential implementation or a separate checkout/worktree, reusing existing isolation when available. Shared interfaces, databases and test resources also need coordination in the plan. Completing a branch does not mean integration is complete.

The agent checks accessible records in known material roots when code scope or working directories change and before implementation. This includes older unfinished deliveries; ended deliveries may still have pending integration dependencies. Unknown roots, inaccessible/stale records and work outside Aimship limit this check. Aimship provides no global lock, automatic agent scheduler, automatic worktree creation or automatic merge.

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
## 8. Software updates and delivery compatibility

For the published preview channel:

```sh
npx aimship@preview install
```

For a source/local candidate, run that release's installer against the same installation home. Existing registered hosts, configuration, custom content and deliveries are retained. Repeating an install is safe for unchanged managed files. The installer reports previous/target versions and conflicts; no background updater or resident process runs.

**Software updates use `install`.** The low-level `update` command edits delivery state, not installed software. Daily work uses the fixed local launcher and rules, not repeated package downloads.

An active conversation may retain old rules after installation. Save current facts and adopt the current core/stage rules at a stable point; use a new conversation if context cannot refresh reliably. A version mismatch prevents new workflow writes until reconciled.

For schema 1 deliveries, explicitly migrate the selected delivery, adopt the new rules, then reconcile documents before continuing stages. Migration preserves originals and historical results; it does not invent missing historical plans or automatically rewrite every document. Unknown formats remain read-only. Completed deliveries are not swept during software upgrades. The agent/contributor [CLI protocol](cli.md) documents recovery details.

<a id="uninstall"></a>
## 9. Host disconnection and uninstallation

Disconnect one host while retaining the core and other registrations:

```sh
node "$HOME/.aimship/bin/aimship.mjs" uninstall --host cursor
```

Shared entries remain when another registered host needs them. Disconnecting the last host still retains the core for diagnostics or reconnection; compatible hosts might continue discovering a remaining shared entry.

Remove all managed software and host entries:

```sh
node "$HOME/.aimship/bin/aimship.mjs" uninstall
```

Full uninstall retains delivery materials, user code, custom files and necessary configuration. Modified/unowned files are preserved and reported. The launcher is removed on complete removal. Restart host sessions to discard cached rules. Deleting delivery history is a separate explicit action.

<a id="troubleshoot"></a>
## 10. Troubleshoot

| Symptom | What to do |
| --- | --- |
| Aimship is absent or duplicated | Reload the host and inspect its actual selector plus reported entry paths/versions. Do not delete unrelated entries. Installation health alone does not establish host discovery. |
| Directory access denied | Authorize the required material/code roots in that host. Report the exact operation; do not move materials or disable permission controls to bypass it. |
| Modified or foreign managed path | Preserve the contents, inspect ownership and explicitly reconcile customizations before retrying. |
| Partial installation | Inspect `status`, fix the reported cause and rerun the exact pending package against the same home. Do not switch versions mid-recovery. |
| Launcher missing or damaged | From the exact source/package installer, run `node bin/aimship.mjs status --home <installation-home>`. This diagnoses without repair; inspect before rerunning the installer. |
| Unexpected version | Query the stable installed launcher. A source checkout or an older release's CLI can report a different version; reload the current binding. |
| Package/version unavailable or authentication failure | Confirm the package, exact version and registry. A failed download is not a completed installation. Keep credentials out of reports. |
| Stale or manually edited `status.md` | Ask the agent to read current state/documents, preserve edits and explicitly regenerate the view. Do not overwrite state from the view. |
| A formal document changed outside the workflow | Reconcile its meaning and affected work; matching state/view revisions do not prove that document content is unchanged. |
| An old delivery cannot advance | Have the agent inspect migration, rule adoption and document reconciliation separately. Preserve historical results and report unresolved blockers. |

For a bug report, include the Aimship version, host/version, exact command or operation, expected/actual result and a minimal synthetic reproduction. Redact credentials and private paths/data. Use [GitHub Issues](https://github.com/clsx/aimship/issues); contributors can follow [CONTRIBUTING](../CONTRIBUTING.md).

<a id="completion"></a>
<a id="decide-when-work-is-done"></a>
## 11. Delivery completion criteria

The commissioned endpoint governs completion. A design commission ends with its agreed design; development includes its required review and validation. Asking to preview current results does not shorten the goal. Explicitly ending earlier retains the original goal and outstanding work in the handoff.

Goal achieved, user acceptance, merge and deployment remain separate. Small later corrections can reopen a delivery while preserving its earlier closure; a new goal or substantial redesign starts a related delivery. Parent/child delivery management and multi-agent orchestration are not automated.
