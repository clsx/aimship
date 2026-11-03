# Local tool protocol

Commands emit JSON. Errors include code/message/recovery and use a nonzero exit. `help` describes options; installation `status` is separate from a delivery's generated `status.md`. The agent interprets business meaning and authorization. Examples use placeholders for absolute paths and the bound version.

## Create and bind

`bind` returns fixed CLI/core/stage paths, the bound software version/schema/protocolVersion, separate executing toolVersion/toolSchemaVersion, and configured data root. On a version switch, rebind through the stable launcher and read the returned fixed CLI help; a retained older executable may return stale schema metadata. Keep that binding for the session. Installation does not create deliveries.

Default initialization must use a distinct delivery directory under the bound dataRoot; the root itself is not a delivery. The current project or supplied-material directory is not an explicit location choice. A different user-selected directory requires init input `storage: {"mode":"explicit","decisionRef":"source/location-decision.md"}` with a nonempty readable local record of that choice. The tool validates evidence access, not the truth of the decision. Do not supply dataRoot in input. No access means report the intended location and stop saving, without falling back elsewhere. Existing deliveries outside the root remain readable and recoverable.

The first successful init receipt includes a neutral directory reminder; updates and resumes do not repeat it.

Before init, save nonempty initialization notes including the original commission in `.aimship/init.md`. A concrete request needs no PRD, code or known technical conditions yet. No templates are automatically created. Minimal input:

```json
{
  "language":"en",
  "goal": {"summary":"Export the currently filtered orders"},
  "goalRef":".aimship/init.md",
  "documentPolicy":{"authority":null,"interaction":null,"prototypeCovered":null,"interface":null,"databases":null},
  "documents":[],
  "stageRuns":[{"id":"requirements-1","stage":"requirements","scope":"Order export","progress":"active","inputRefs":[".aimship/init.md"],"outputRefs":[]}],
  "currentRun":"requirements-1",
  "next":{"action":"Clarify export fields and acceptance criteria","inputRefs":[".aimship/init.md"]}
}
```

language and goal.summary are required in new input; an absent or null endpoint defaults to implementation, review, independent verification and delivery acceptance in the saved language, goalRef to .aimship/init.md, documents to [], and documentPolicy fields to null. Known facts may be supplied. Use `language: "zh-CN"` or `"en"`: explicit language preference takes precedence, otherwise use the delivery conversation language. This setting persists through update/render/resume and guides new formal documents; preserve original input, existing documents, filenames and machine identifiers. An explicit language update changes subsequent generated display, not existing document text. For artifact conditions, null means unknown, while false/none/[] mean explicitly not applicable. The CLI validates saved structure, not whether the user's request is concrete or authorized; the Agent must establish that before creating records.

```sh
node '<stable-launcher>' bind
node '<fixed-cli>' init '<delivery-dir>' --rules-version '<bound-version>' --input '<init.json>'
```

init uses schema 5 and delivery protocol 2, allocates deliveryId and revision 0, creates `.aimship/state.json`, and generates `status.md`. Add that ID to the document information at the next save point. Identity/version/timestamps, protocolVersion and documentDigests are managed; never supply them in a patch. `writeResult` is return metadata, not state input. Its receipt contains actual identity, directory/state/status paths, bound version, current stage and next action; statusPath is null when view repair is needed. Verify the saved files before presenting the user receipt. Repeated init returns ALREADY_EXISTS; read/resume the same delivery and render a missing view instead of replaying creation.

`documentPolicy.authority`: null while the requirement authority is undecided; authored → prd.md; adopted → the registered retained PRD file in source/ (mode input); editable → an explicitly authorized existing PRD. All three use kind prd and goalRef points to its actual path. `interaction`, `prototypeCovered`, `interface` (none/http/other) and target `databases` IDs record artifact conditions. They do not select a preset route. Prototype coverage is descriptive; a prototype is optional unless selected in stageRuns, in which case its completion and applicable input check or AI-output approval remain required. Register the first real PRD and switch goalRef in the same update; this reference-only transition does not need a fabricated goal decision. Actual goal/endpoint changes still require goal.decisionRef. Early frame/requirements work can be active without the draft; done requires it. Design requires adopted, checked input requirements or approved AI-authored requirements and an agreed endpoint, but may analyze unknown technical conditions. Resolve those conditions before completing design or starting dependent contract/cases/plan/implementation. Required document approvals remain checked even when producer runs are absent; existing stage ordering and review semantics are unchanged.

Register documents as `{kind,path,mode,version,assetRefs?}`. List local/repository prototype images, scripts and other review-relevant assets in assetRefs so their bytes participate in the document fingerprint; the Agent must identify the complete asset set. Kinds: prd, tech-design, plan, testing, review, diagnosis, handoff, change-log, prototype, contract, sql, source. New formal Markdown follows the artifact map's root filename and ordered ordinary Markdown headings. Modes: new for AI-authored files, reused for existing reviewable outputs, input for unchanged supplied PRD/prototype. Input basisRef preserves the actual user request to deliver from that material; mere file existence is insufficient. Inputs need a current self-check and become adopted, without an approved record. An unresolved question uses next.questionRef pointing to an existing concrete question/options/impact; the current run stays blocked. Clear it with null after resolving the question. No new approval is recorded for that clarification. Reused files additionally need `basisRef` recording location/version/coverage/gaps and editability; unsupported content is explicitly not checked. New HTML prototype is prototype/index.html; register other agreed formats. HTTP contracts use openapi.yaml unless reused. SQL filenames follow database count. Source files are immutable adopted versions by workflow, not OS access controls.

## Update and inspect

```sh
node '<fixed-cli>' read '<delivery-dir>' --rules-version '<bound-version>'
node '<fixed-cli>' update '<delivery-dir>' --revision 0 --rules-version '<bound-version>' --input '<patch.json>'
node '<fixed-cli>' check '<delivery-dir>' --all --rules-version '<bound-version>'
node '<fixed-cli>' resume '<delivery-dir>' --rules-version '<bound-version>'
```

Ordinary metadata objects merge; ordinary arrays replace. Controlled facts (`batches`, `stageRuns`, `reviewHistory`, `openChanges`, `outcome`, `currentRun`) are updated only through an `operations` array. `--input -` accepts stdin JSON. A revision conflict requires rereading and reconciling, not guessing a revision. Keep one writing session per delivery. Init admits empty domain facts, planned runs and active requirement intake; it cannot import completed runs, batches or approvals.

### Domain operations

The agent submits actual facts; the tool evaluates relationships and renders current views. These are internal JSON actions, not new commands users must learn.

| Action | Minimal payload | Purpose |
| --- | --- | --- |
| `register-batches` | `batches: [{id,definitionRef,taskRefs,dependsOn}]` | Register stable business B definitions from the current approved plan. The tool binds `planBasis`; started definitions require a revised approved plan and scoped impact. |
| `record-run` | `run: {id,stage,scope,progress,inputRefs,outputRefs,...}` | Add actual execution or update unfinished work. Completed records remain immutable. Started facts precede future planned entries; a planned run starts in actual execution order. |
| `remove-planned-run` | `runId` | Remove an unstarted, unreferenced arrangement; started history cannot be removed. |
| `record-review` | `record: {id,kind,document,version,digest,sourceRef,summary,...}` | Append a current-content self-check, explicit approval, feedback or editorial reconciliation. |
| `record-change` | `change: {id,ref,status,impactRef?,affectedRefs?}` | Preserve change history and scoped impact; closing a change does not make affected work current. |
| `record-outcome` | `outcome: {goal?,acceptance?,...}` | Record actual goal conclusion and user acceptance separately. |
| `set-current` | `runId` | Select an existing run. |
| `set-applicability` | `runId,applicability,forObjectKey?,assessmentRef?,coverageRefs?` | Reassess actual applicability. Recovery to current binds an explicit object digest and readable assessment; coverageRefs identifies any specifically reassessed test coverage. |

Example after plan approval:

```json
{"operations":[{"type":"register-batches","batches":[{"id":"B-001","definitionRef":"plan.md#B-001","taskRefs":["plan.md#TASK-001"],"dependsOn":[]}]}]}
```

Business B identity is separate from execution records. Started implementation requires `workType: "batch"|"repair"`; business work names a registered `batchId`. A repair is a new run for the same B, or an explicitly scoped independent repair, and retains `repairOf`/historical result references. Repairs do not add business batches. A completed engineering run (`implement`, `review`, `verify`) records `objectKey`, a SHA-256 digest of the actual reviewed/executed object basis; a branch name is insufficient. This digest binds recorded facts, not proof that an agent performed the work.

Review records explicitly use `reviewScope: "batch"|"overall"` and `reviewOf` implementation IDs. A batch review covers its actual implementation and repair work; overall review covers all actual implementation including independent repairs. Preserve unsuccessful REV records and link their disposition through `historyResultRefs`. Narrow batch review cannot clear an overall failure. Each batch includes automatic batch review and authorized fixes/recheck, then stops. After the last batch recommend a new session for the existing overall-review stage; explicit user authorization can continue it here. Overall review stops before formal verification.

Formal verify records declare `coverageRefs` against approved TC definitions (or explicitly registered `coverageRefs` on a reused testing document). Optional `coverageResults: [{ref,result}]` records mixed results; otherwise the run result applies to its declared coverage. Later retests link old result references and replace only matching coverage on the currently reviewed object. Prior passing coverage on another object needs a target-bound applicability assessment or a new run. No last-RUN-wins rule; unknown, mixed or untested coverage does not become passed. Development compilation/local self-checks are not formal RUNs.

Progress is `planned|active|blocked|done`; result is `passed|failed|not-run|unknown|mixed`; applicability is `current|needs-review|unknown`. These dimensions remain separate from document approval and user acceptance. `approvalBasis`, `planBasis` and coverage invalidation metadata are tool-managed. Material changes use a current document version plus CHG impact to mark affected work for reassessment; unaffected historical results and approvals remain recorded. New work still needs current prerequisite approvals.

A saved implementation can return `continue-implementation-review`; a failed batch review can return `continue-batch-repair` within existing authorization. Neither starts the next batch. A repair without a known responsibility returns `inspect-review-scope`; inspect its actual basis rather than guessing from a scheduled review. Session advice does not execute work or grant authorization. Explicit limited-scope commissions retain their actual boundary without fabricated full-delivery work.

New Markdown uses the ordinary headings in the artifact map and searchable business IDs. Checks reject missing or duplicate definitions and unresolved ID references. Results use section keys or unique record IDs as search locators; no HTML anchors, embedded definition metadata, item versions or hidden traceability index are required. These structural checks do not establish semantic completeness.

Bare IDs resolve against current local definitions, including readable IDs in an explicitly registered reused Markdown requirement authority. File-qualified Markdown record citations check the actual source file and a unique substantive record; missing, duplicate or unreadable sources fail. Reused documents retain their outline and separately reported unchecked content. B/TASK/TC definitions belong in batch/task/case design sections; execution sections may cite those IDs without defining new obligations. Delivery `language` is required for all current states.

References stay delivery-root-relative despite state being internal, or use `repo:<id>/<path>` / HTTP(S). Repository records `{id,path,role}` name actual absolute checkout/worktree roots. A branch is not a code version. Paths cannot escape roots through traversal or symlinks. check defaults to current inputs; --all adds registered history/decisions/outcomes. Exact fragments in registered new Markdown are checked; reused/remote/unsupported ones return not-checked. That does not establish semantics or passing verification.

Read/check/resume are read-only. They return view diagnostics and changed registered documents; matching revisions do not prove unchanged formal content. Resume canProceed is conservative structural readiness, never authorization or acceptance. `scan <material-root>` reads immediate delivery children using .aimship/state.json, deduplicates deliveryId and reports conflicting/unknown/inaccessible records. It neither scans unknown roots nor determines code-writing safety; inspect recorded roles/scopes and actual Git/worktree identity.

## State and view recovery

State writes are atomic per file and keep `.aimship/state.previous.json`. Across formal documents/state/status there is no transaction. First persist unfinished intent, edit and inspect documents, then save state. Managed document digests detect some external changes, never semantic equivalence. Initialization notes can be maintained and saved normally; changes to business requirements still belong in the formal authority/change log and follow its review rules. Preserve the original commission within the notes.

A write returns the actual state revision and `writeResult: {stateSaved:true,revision,view}`. If view status is protected/error, the JSON is already saved. Do not replay the business patch; explicitly repair:

```sh
node '<fixed-cli>' render '<delivery-dir>' --revision '<saved-revision>' --rules-version '<bound-version>'
node '<fixed-cli>' render '<delivery-dir>' --revision '<saved-revision>' --rules-version '<bound-version>' --preserve-edits
```

Status and the finite generated H3 areas in new plan/testing/review documents share one state snapshot. AI maintains design, findings, full RUN/REV evidence and execution notes outside those areas. The delivery identity, view digests and state revision are stored in `.aimship/view.json`; identity and revision must both match for a view to be current. Missing/stale views can be regenerated; modified or untrusted existing status is preserved in place by default. --preserve-edits first saves its full bytes to `.aimship/status-edits-<id>.md`, then rebuilds. Finite areas are protected separately; missing or duplicate current-template areas are reported without guessing a legacy layout. Approval evidence is never overwritten by generation. Inspect the preserved intent and update formal authority separately. View text does not authorize acceptance, scope changes or publication. render does not increment state revision.

`recover <dir> --revision <backup-revision> --rules-version <bound-version>` restores only over missing/corrupt state, preserves corrupt bytes and advances revision. It refuses a valid or unknown state. Inspect actual effects afterward, never automatically repeat them. Remove only a stale task lock after confirming no writer exists.

## Rule updates


Bind the active tool and reload its rules before work. The session's `--rules-version`, executing tool and active installation must match exactly. `protocolVersion` separately identifies compatible state, approval and stage semantics; schema/policy validation still applies. Package metadata declares `aimship.protocolVersion`. Current delivery protocol 2 requires schema 5. Historical Preview 17/18 mappings remain fixed at protocol 1 for compatibility identification; they are not promoted to the current protocol. Schema4/protocol1 deliveries cannot be continued or re-rendered with this tool. Preserve their files and complete them with their supported tool before switching, or start a new delivery under the new contract. There is no migration, old-format inference or version-field rewrite.

`rulesVersion` records the last saving tool. Reads/checks/resume and render do not rewrite facts or adopt metadata. A schema/policy/protocol mismatch blocks writes (`PROTOCOL_MISMATCH`); a mixed session/tool/active installation blocks writes (`VERSION_MISMATCH`). Installation confirmation does not permit unsupported state writes. Downgrading does not migrate new records to an older protocol.

The installer compares source/target package declarations, not user deliveries. Compatible switches proceed normally. Before pending-manifest, entry or active-pointer writes, a breaking or unverified switch requires explicit acceptance. With stdin/stdout/stderr all attached to a terminal, the CLI shows bilingual impact text and one prompt; only a trimmed `y` or `Y` accepts. Other input, Enter, EOF and Ctrl+C cancel, with exit code 0 and a human-readable unchanged-installation receipt. Internally cancellation returns `result: "cancelled"`, `upgradeRiskAccepted: false` and the unchanged `activeVersion`; it is not an exception. Redirected/piped or programmatic calls do not prompt: they retain the `UPGRADE_CONFIRMATION_REQUIRED` JSON error and exit code 1, with versions, compatibility, impact and recovery. To explicitly accept noninteractively, use the same target package's `install --accept-upgrade-risk`; this also skips the terminal prompt and retains the normal JSON receipt. After prompted acceptance, success has a short bilingual receipt; actual failures still exit 1 with their error code, cause and recovery. No delivery directories were scanned. `npx --yes` is only npm's package-download/run consent. Acceptance does not bypass unsupported delivery writes. Interrupted accepted installs record that acceptance in the pending manifest and resume using the same exact package. Reinstalling the active version needs no new protocol decision. Legacy targets with exact software-version guards can still block continuation despite matching semantic protocol.

Software installation does not authorize inventing approvals, rewriting user documents or hand-editing state metadata.

Goal changes need a new goal.decisionRef; prior goals/outcomes are retained. A met goal requires goalConclusionRef; acceptance needs its own acceptanceRef. Merge and deployment refs remain independent. Reopening increments cycle, appends closureRefs and resets acceptance. See the [README](../README.md#update) for software lifecycle operations and the [Guide](guide.md#hosts) for host-discovery limits.

## Document review protocol

Schema 5 requires `reviewPolicy: 1`, append-only `reviewHistory` and `deliveryPolicy: {version: 1}`. Document approvals remain bound to document version/content; business item numbers do not replace them.

Each record has `{id, kind, document, version, digest, sourceRef, summary}`. Kinds are `self-check`, `approved`, `changes-requested`, and `editorial`. `self-check` requires `result: "passed"` or `"failed"`; only a passing self-check can support approval. `approved` additionally requires `decision: "explicit-approval"`; `editorial` requires `previousDigest`. Use unique local review-record IDs (for example `approval-1`); these are state record identifiers, not a replacement for REQ/AC/CHG. Append new records through `record-review` in a revision-checked `update`. Existing records cannot be edited, removed or reordered. The tool records `sourceDigest` from readable local or repo-relative evidence; keep it unchanged when sending history back. Evidence files are versioned/immutable: changed or missing evidence produces evidence-changed and does not release dependencies; preserve the original bytes and add new decisions in new evidence files. Evidence fragments locate unique ordinary headings or numbered records, not HTML anchors. A remote source must have a local preserved decision excerpt with its original locator and date.

`read`, `check`, and `resume` return `review.documents` with current `path`, `version`, `digest`, `selfCheck`, `approval` and status. First append a self-check of those exact bytes; after presenting the document and receiving explicit approval, append an approved record binding the same version/digest and the actual user message. Questions, silence, and “show the result” cannot be recorded as approval. A hash/source reference validates the record's content basis, **not user identity or authenticity**. Never synthesize a real approval to make an update pass.

Nonblocking questions remain in their formal document with impact and resolution timing. Use `next.questionRef` only for a current blocker; approving a document does not resolve every question.

Production `progress: done` may be saved while approval is pending. Starting/completing dependent runs is blocked until prerequisite completion and document approval are current. Design runs default to the preceding applicable design responsibility, not a later execution run during rework; engineering work uses the domain relationships (business dependencies, reviewOf, formal coverage and reviewed object), with explicit `dependsOn` for actual additional prerequisites. The initial applicable development order is requirements, technical design, interface/SQL, test-design, plan, implement. Unselected stages are not created. Contract can produce only SQL when no interface change applies; technical design no longer requires SQL files before completion.

For new `plan.md` and `testing.md`, fingerprints cover the content before the ordinary headings mapped to `execution` and `runs` respectively. Append implementation and RUN/conclusion evidence after those boundaries. Reused formats and other documents use whole-file content; remote/binary or linked-asset semantic inspection still belongs to the host/Agent. `done`, matching hashes and structural checks do not prove semantic quality.

When the PRD authority path changes, retain the prior registered file as kind source (mode reused), register one current prd, and preserve the old result reference in the requirement run. Use the real goal decision and an open CHG for a change to approved requirements or adopted inputs; affected input checks and AI-output reviews must be reassessed before dependent work continues. This changes current material, not historical approval records.

A material change needs an open CHG with impact/decision evidence, a revised document version, a new self-check and explicit reapproval. Old review records remain. Affected producer/dependent runs become `needs-review`; update currentRun/next to the re-review stop and restore applicability after evidence-backed rechecking in dependency order. Independent branches are preserved. An `editorial` record carries a prior approval only after a same-version self-check explains a formatting/typo change and references its previous digest; it is not a new user approval. Do not hide changed design in excluded result sections. Final `outcome.acceptance` stays independent.

See the [Agent review workflow](../skills/aimship/references/document-review.md) for presentation, stage stops and approval responsibilities.

## Standard completeness and session suggestions

New state defaults to `deliveryPolicy: {version: 1}`. The standard main sequence is requirements/acceptance, technical and applicable contract/interaction artifacts, cases, plan, implementation with batch review, overall review, verification, handoff/acceptance. Do not present stageRuns as an arbitrary menu of core stages. Preserve existing materials and inspect them before adoption. Mode input records supplied PRD/prototype with actual adoption intent and a current self-check; it is not an approved AI output.

An explicit limited-scope decision (including no cases and testing) is referenced by `deliveryPolicy.partialRef` in existing PRD/change material. Such a scope may reach `outcome.goal: met` and have a real acceptance decision, but derived `completion.status` remains `partial-scope`, never `standard-complete`. Adding/changing/removing this basis needs a new goal.decisionRef, preserving goal history; set partialRef to null to restore standard scope. Standard goal completion checks recorded stages/approvals, passing batch and overall review, passing independent verification, handoff and resolvable evidence; standard-complete additionally requires recorded acceptance. These checks cannot prove actual execution or semantic quality. Failed or omitted checks must never be labeled passed.

Independent review, verify-only work or limited handoff can omit standard upstream work only with a nonempty readable local partialRef (including a resolvable ordinary heading or record if supplied). The tool checks the evidence reference, not whether a user actually authorized its contents. Declared dependencies and applicable document approvals remain in force. Planned future work and draft materials may be saved before entry conditions are met; active/done transitions are checked. Existing records remain readable and report unresolved entry conditions rather than automatically acquiring a scope exception.

Reviews identify their actual implementation coverage with `reviewOf: [implementationRunId, ...]`; overall review uses `reviewScope: "overall"`; batch review uses `reviewScope: "batch"` with its business batchId. They remain separate responsibilities and records. An unresolved failed review prevents standard completion even if an earlier overall review passed. A passing repair review or retest may list the superseded review/RUN result references in its existing `historyResultRefs`, preserving old failures; the Agent must verify that it actually resolves or covers them on current objects. Verification must follow the applicable overall review. Merely setting a link is not semantic evidence.

`run.sessionGroup` remains advisory context, not permission to cross stages. Each user-visible work unit finishes its work/self-check, saves artifacts and stops; implementation/review checkpoints inside one batch follow the scoped continuation advice above: `session.action` is await-review for required approval or await-continue for a completed stage awaiting continuation; `stop` and `suggestNewSession` make that advice explicit. `suggestNewSession` is true only at major work boundaries: requirements to design, design/applicable contracts to test design, plan to implementation, batch review to the next batch/overall review, and overall review to independent verification. Pending review remains the current task; a suggestion never skips it. Approval and continuation may be expressed together. This is agent interaction guidance, not interception of general-purpose tools or a new approval for non-review stages. `read/check/resume` and `writeResult.session` use the same rule. Unconfirmed saves return reconcile-save with no continuation; repair the view at the saved revision without replaying approval. Pending review never becomes approval through resume or “continue”.

`read` and `resume` accept optional `--delivery-id <known-id>` to reject a wrong directory binding. A directory remains required; no implicit latest-delivery lookup exists. Resume is read-only and inspects actual state, approval/content versions, references and view diagnostics; old prompts grant no approval. The Agent must additionally inspect relevant complete formal documents, actual artifacts and unfinished effects before acting.


Review run `ready` describes a completed, current record; `releaseReady` additionally requires a usable passing review before releasing dependent work. Failed review records remain saved. A later passing repair review must preserve the old result reference and cover the affected implementation scope; unrelated passing reviews do not clear the failure. Session suggestions distinguish exhausting registered work from completing the agreed goal: an unfinished goal with no next run requires arranging the next authorized work, not declaring finished.

The generated status page puts current stage, actual blockers and concrete next action first, then Stage / artifact-or-result / status. It links formal results in that table instead of repeating a navigation inventory and omits conversational continuation instructions. The delivery directory and overall saved timestamp remain in saved information; no per-output timestamp is inferred. Future standard stages are not started, not current defects; unknown contract applicability remains pending design. Final completion diagnostics remain enforced and are shown at handoff. Engineering details and generation metadata follow the user summary.
