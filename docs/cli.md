# Local tool protocol

Commands emit JSON. Errors include code/message/recovery and use a nonzero exit. `help` describes options; installation `status` is separate from a delivery's generated `status.md`. The agent interprets business meaning and authorization. Examples use placeholders for absolute paths and the bound version.

## Create and bind

`bind` returns fixed CLI/core/stage paths, the bound version/schema, separate executing toolVersion/toolSchemaVersion, and configured data root. On a version switch, rebind through the stable launcher and read the returned fixed CLI help; a retained older executable may return stale schema metadata. Keep that binding for the session. Installation does not create deliveries.

Default initialization must use a distinct delivery directory under the bound dataRoot; the root itself is not a delivery. The current project or supplied-material directory is not an explicit location choice. A different user-selected directory requires init input `storage: {"mode":"explicit","decisionRef":"source/location-decision.md"}` with a nonempty readable local record of that choice. The tool validates evidence access, not the truth of the decision. Do not supply dataRoot in input. No access means report the intended location and stop saving, without falling back elsewhere. Existing deliveries outside the root remain readable and recoverable.

Before init, save the nonempty original input in `source/request.md`. A concrete request needs no PRD, code or known technical conditions yet. No templates are automatically created. Minimal input:

```json
{
  "language":"en",
  "goal": {"summary":"Export the currently filtered orders", "endpoint":null},
  "goalRef":"source/request.md",
  "documentPolicy":{"authority":null,"interaction":null,"prototypeCovered":null,"interface":null,"databases":null},
  "documents":[],
  "stageRuns":[{"id":"requirements-1","stage":"requirements","scope":"Order export","progress":"active","inputRefs":["source/request.md"],"outputRefs":[]}],
  "currentRun":"requirements-1",
  "next":{"action":"Clarify export fields and acceptance criteria","inputRefs":["source/request.md"]}
}
```

language and goal.summary are required in new input; absent endpoint defaults to null, goalRef to source/request.md, documents to [], and documentPolicy fields to null. Known facts may be supplied. Use `language: "zh-CN"` or `"en"`: explicit language preference takes precedence, otherwise use the delivery conversation language. This setting persists through update/render/resume and guides new formal documents; preserve original input, existing documents, filenames and machine identifiers. An explicit language update changes subsequent generated display, not existing document text. Null means unknown, while false/none/[] mean explicitly not applicable. The CLI validates saved structure, not whether the user's request is concrete or authorized; the Agent must establish that before creating records.

```sh
node '<stable-launcher>' bind
node '<fixed-cli>' init '<delivery-dir>' --rules-version '<bound-version>' --input '<init.json>'
```

init uses schema 4, allocates deliveryId and revision 0, creates `.aimship/state.json`, and generates `status.md`. Add that ID to the document information at the next save point. Identity/version/timestamps, documentDigests are managed; never supply them in a patch. `writeResult` is return metadata, not state input. Its receipt contains actual identity, directory/state/status paths, bound version, current stage and next action; statusPath is null when view repair is needed. Verify the saved files before presenting the user receipt. Repeated init returns ALREADY_EXISTS; read/resume the same delivery and render a missing view instead of replaying creation.

`documentPolicy.authority`: null while the requirement authority is undecided; authored → prd.md; adopted → scope.md; editable → an explicitly authorized existing PRD containing this commission's complete scope/authorization/endpoint. `interaction`, `prototypeCovered`, `interface` (none/http/other) and target `databases` IDs record artifact conditions. They do not select a preset route. Register the first real PRD/Scope and switch goalRef in the same update; this reference-only transition does not need a fabricated goal decision. Actual goal/endpoint changes still require goal.decisionRef. Early frame/requirements/scope work can be active without the draft; done requires it. Design requires approved requirements and an agreed endpoint, but may analyze unknown technical conditions. Resolve those conditions before completing design or starting dependent contract/cases/plan/implementation. Required document approvals remain checked even when producer runs are absent; existing stage ordering and review semantics are unchanged.

Register documents as `{kind,path,mode,version,assetRefs?}`. List local/repository prototype images, scripts and other review-relevant assets in assetRefs so their bytes participate in the document fingerprint; the Agent must identify the complete asset set. Kinds: prd, scope, tech-design, plan, testing, review, diagnosis, handoff, change-log, prototype, contract, sql, source. New formal Markdown follows the artifact map's root filename and ordered ordinary Markdown headings. Reused files additionally need `basisRef` recording location/version/coverage/gaps and editability; unsupported content is explicitly not checked. New HTML prototype is prototype/index.html; register other agreed formats. HTTP contracts use openapi.yaml unless reused. SQL filenames follow database count. Source files are immutable adopted versions by workflow, not OS access controls.

## Update and inspect

```sh
node '<fixed-cli>' read '<delivery-dir>' --rules-version '<bound-version>'
node '<fixed-cli>' update '<delivery-dir>' --revision 0 --rules-version '<bound-version>' --input '<patch.json>'
node '<fixed-cli>' check '<delivery-dir>' --all --rules-version '<bound-version>'
node '<fixed-cli>' resume '<delivery-dir>' --rules-version '<bound-version>'
```

Objects merge, arrays replace entirely; null is literal, not deletion. `--input -` accepts stdin JSON. A revision conflict requires rereading and reconciling, not guessing a revision. Keep one writing session per delivery.

Stage runs are ordered `{id,stage,scope,progress,inputRefs,outputRefs}`. currentRun refers to one ID or null. Progress: planned/active/blocked/done; result: passed/failed/not-run/unknown/mixed; applicability: current/needs-review/unknown. Done requires a precise resultRef. Preserve past results in priorResultRef/historyResultRefs; do not delete started runs. Shared files never complete two runs automatically. Plan must complete before implementation. For standard delivery, review requires completed implementation coverage, verify requires a passing overall review with resolved preceding reviews, and handoff requires passing verification (or a passing rerun retaining earlier results). These required predecessors cannot be removed by empty dependsOn/inputRefs. Actual execution, coverage quality and approval authenticity still require Agent judgment.

New Markdown uses the ordinary headings in the artifact map and searchable business IDs. Checks reject missing or duplicate definitions and unresolved ID references. Results use section keys or unique record IDs as search locators; no HTML anchors, embedded definition metadata, item versions or hidden traceability index are required. These structural checks do not establish semantic completeness.

Bare IDs resolve against current local definitions, including readable IDs in an explicitly registered editable Markdown requirement authority. File-qualified Markdown record citations check the actual source file and a unique substantive record; missing, duplicate or unreadable sources fail. Reused documents retain their outline and separately reported unchecked content. B/TASK/TC definitions belong in batch/task/case design sections; execution sections may cite those IDs without defining new obligations. Delivery `language` is required for all current states.

References stay delivery-root-relative despite state being internal, or use `repo:<id>/<path>` / HTTP(S). Repository records `{id,path,role}` name actual absolute checkout/worktree roots. A branch is not a code version. Paths cannot escape roots through traversal or symlinks. check defaults to current inputs; --all adds registered history/decisions/outcomes. Exact fragments in registered new Markdown are checked; reused/remote/unsupported ones return not-checked. That does not establish semantics or passing verification.

Read/check/resume are read-only. They return view diagnostics and changed registered documents; matching revisions do not prove unchanged formal content. Resume canProceed is conservative structural readiness, never authorization or acceptance. `scan <material-root>` reads immediate delivery children using .aimship/state.json, deduplicates deliveryId and reports conflicting/unknown/inaccessible records. It neither scans unknown roots nor determines code-writing safety; inspect recorded roles/scopes and actual Git/worktree identity.

## State and view recovery

State writes are atomic per file and keep `.aimship/state.previous.json`. Across formal documents/state/status there is no transaction. First persist unfinished intent, edit and inspect documents, then save state. Managed document digests detect some external changes, never semantic equivalence. A changed source/request.md cannot be rebaselined by an unrelated update. Restore the preserved original before continuing; record actual requirement changes in the editable authority/change log, retaining the original input.

A write returns the actual state revision and `writeResult: {stateSaved:true,revision,view}`. If view status is protected/error, the JSON is already saved. Do not replay the business patch; explicitly repair:

```sh
node '<fixed-cli>' render '<delivery-dir>' --revision '<saved-revision>' --rules-version '<bound-version>'
node '<fixed-cli>' render '<delivery-dir>' --revision '<saved-revision>' --rules-version '<bound-version>' --preserve-edits
```

The delivery identity, view digest and state revision are stored in `.aimship/view.json`; identity and revision must both match for a view to be current. Missing/stale views can be regenerated; modified or untrusted existing status is preserved in place by default. --preserve-edits first saves its full bytes to `.aimship/status-edits-<id>.md`, then rebuilds. Inspect the preserved intent and update formal authority separately. View text does not authorize acceptance, scope changes or publication. render does not increment state revision.

`recover <dir> --revision <backup-revision> --rules-version <bound-version>` restores only over missing/corrupt state, preserves corrupt bytes and advances revision. It refuses a valid or unknown state. Inspect actual effects afterward, never automatically repeat them. Remove only a stale task lock after confirming no writer exists.

## Rule updates


Bind the active tool and reload its rules before work. State, session and executing tool must use the same rules version. Software installation does not authorize changing delivery state versions or inventing approvals.

Goal changes need a new goal.decisionRef; prior goals/outcomes are retained. A met goal requires goalConclusionRef; acceptance needs its own acceptanceRef. Merge and deployment refs remain independent. Reopening increments cycle, appends closureRefs and resets acceptance. See the [README](../README.md#update) for software lifecycle operations and the [Guide](guide.md#hosts) for host-discovery limits.

## Document review protocol

Schema 4 requires `reviewPolicy: 1`, append-only `reviewHistory` and `deliveryPolicy: {version: 1}`. Document approvals remain bound to document version/content; business item numbers do not replace them.

Each record has `{id, kind, document, version, digest, sourceRef, summary}`. Kinds are `self-check`, `approved`, `changes-requested`, and `editorial`. `self-check` requires `result: "passed"` or `"failed"`; only a passing self-check can support approval. `approved` additionally requires `decision: "explicit-approval"`; `editorial` requires `previousDigest`. Use unique local review-record IDs (for example `approval-1`); these are state record identifiers, not a replacement for REQ/AC/CHG. Send the complete preserved history plus new records through revision-checked `update`. Existing records cannot be edited, removed or reordered. The tool records `sourceDigest` from readable local or repo-relative evidence; keep it unchanged when sending history back. Evidence files are versioned/immutable: changed or missing evidence produces evidence-changed and does not release dependencies; preserve the original bytes and add new decisions in new evidence files. Evidence fragments locate unique ordinary headings or numbered records, not HTML anchors. A remote source must have a local preserved decision excerpt with its original locator and date.

`read`, `check`, and `resume` return `review.documents` with current `path`, `version`, `digest`, `selfCheck`, `approval` and status. First append a self-check of those exact bytes; after presenting the document and receiving explicit approval, append an approved record binding the same version/digest and the actual user message. Questions, silence, and “show the result” cannot be recorded as approval. A hash/source reference validates the record's content basis, **not user identity or authenticity**. Never synthesize a real approval to make an update pass.

Production `progress: done` may be saved while approval is pending. Starting/completing dependent runs is blocked until prerequisite completion and document approval are current. Runs default to depending on their predecessor; explicit `dependsOn: [preceding-run-ids]` supports recorded independent branches, while input/output producers and earlier selected development prerequisites also apply. The initial applicable development order is requirements/Scope, technical design, interface/SQL, test-design, plan, implement. Unselected stages are not created. Contract can produce only SQL when no interface change applies; technical design no longer requires SQL files before completion.

For new `plan.md` and `testing.md`, fingerprints cover the content before the ordinary headings mapped to `execution` and `runs` respectively. Append implementation and RUN/conclusion evidence after those boundaries. Reused formats and other documents use whole-file content; remote/binary or linked-asset semantic inspection still belongs to the host/Agent. `done`, matching hashes and structural checks do not prove semantic quality.

A material change needs an open CHG with impact/decision evidence, a revised document version, a new self-check and explicit reapproval. Old review records remain. Affected producer/dependent runs become `needs-review`; update currentRun/next to the re-review stop and restore applicability after evidence-backed rechecking in dependency order. Independent branches are preserved. An `editorial` record carries a prior approval only after a same-version self-check explains a formatting/typo change and references its previous digest; it is not a new user approval. Do not hide changed design in excluded result sections. Final `outcome.acceptance` stays independent.

See the [Agent review workflow](../skills/aimship/references/document-review.md) for presentation, automatic continuation after approval and compatibility responsibilities.

## Standard completeness and session suggestions

New state defaults to `deliveryPolicy: {version: 1}`. The standard main sequence is requirements/acceptance, technical and applicable contract/interaction artifacts, cases, plan, implementation with batch review, overall review, verification, handoff/acceptance. Do not present stageRuns as an arbitrary menu of core stages. Preserve existing materials and inspect them before adoption; reuse does not imply approval.

An explicit limited-scope decision (including no cases and testing) is referenced by `deliveryPolicy.partialRef` in existing PRD/Scope/change material. Such a scope may reach `outcome.goal: met` and have a real acceptance decision, but derived `completion.status` remains `partial-scope`, never `standard-complete`. Adding/changing/removing this basis needs a new goal.decisionRef, preserving goal history; set partialRef to null to restore standard scope. Standard goal completion checks recorded stages/approvals, passing batch and overall review, passing independent verification, handoff and resolvable evidence; standard-complete additionally requires recorded acceptance. These checks cannot prove actual execution or semantic quality. Failed or omitted checks must never be labeled passed.

Independent review, verify-only work or limited handoff can omit standard upstream work only with a nonempty readable local partialRef (including a resolvable ordinary heading or record if supplied). The tool checks the evidence reference, not whether a user actually authorized its contents. Declared dependencies and applicable document approvals remain in force. Planned future work and draft materials may be saved before entry conditions are met; active/done transitions are checked. Existing records remain readable and report unresolved entry conditions rather than automatically acquiring a scope exception.

Reviews identify their actual implementation coverage with `reviewOf: [implementationRunId, ...]`; overall review has `overall: true`. For a single batch one review may explicitly cover both. An unresolved failed review prevents standard completion even if an earlier overall review passed. A passing repair review or retest may list the superseded review/RUN result references in its existing `historyResultRefs`, preserving old failures; the Agent must verify that it actually resolves or covers them on current objects. Verification must follow the applicable overall review. Merely setting a link is not semantic evidence.

`run.sessionGroup` is an advisory group ID persisted when a new policy-enabled run is saved: requirements; technical/contract/prototype; cases; plan; each implementation batch with its batch review; overall review; each verify batch. Adjusting groups does not change document approval, add a stage, or block work. `read/check/resume` expose `session.action`, groups and a concise continuation entry; pending review and unconfirmed saves do not return a next-stage entry. `writeResult.session` becomes reconcile-save with no entry if view saving fails, even when stateSaved is true. Repair at the returned revision; do not repeat the approval update. At a confirmed saved group boundary, the Agent suggests a new session without executing the next group in that response. A user request to continue here proceeds with the normal authorized update.

`read` and `resume` accept optional `--delivery-id <known-id>` to reject a wrong directory binding. A directory remains required; no implicit latest-delivery lookup exists. Resume is read-only and inspects actual state, approval/content versions, references and view diagnostics; old prompts grant no approval. The Agent must additionally inspect relevant complete formal documents, actual artifacts and unfinished effects before acting.


Review run `ready` describes a completed, current record; `releaseReady` additionally requires a usable passing review before releasing dependent work. Failed review records remain saved. A later passing repair review must preserve the old result reference and cover the affected implementation scope; unrelated passing reviews do not clear the failure. Session suggestions distinguish exhausting registered work from completing the agreed goal: an unfinished goal with no next run requires arranging the next authorized work, not declaring finished.
