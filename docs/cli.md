# Local tool protocol

Commands emit JSON. Errors include code/message/recovery and use a nonzero exit. `help` describes options; installation `status` is separate from a delivery's generated `status.md`. The agent interprets business meaning and authorization. Examples use placeholders for absolute paths and the bound version.

## Create and bind

`bind` returns fixed CLI/core/stage paths, version and configured data root. Keep that binding for the session. Installation does not create deliveries.

Before init, save `source/request.md` and the PRD/Scope draft from the [templates](../skills/aimship/references/document-patterns.md). No templates are automatically created. Example input:

```json
{
  "goal": {"summary":"Define the selected design", "endpoint":"Design handoff"},
  "goalRef":"prd.md",
  "documentPolicy":{"authority":"authored","interaction":false,"prototypeCovered":false,"interface":"none","databases":[]},
  "documents":[{"kind":"prd","path":"prd.md","mode":"new","version":"1"}],
  "stageRuns":[],
  "next":{"action":"Draft the agreed design","inputRefs":["prd.md"]}
}
```

```sh
node '<stable-launcher>' bind
node '<fixed-cli>' init '<delivery-dir>' --rules-version '<bound-version>' --input '<init.json>'
```

init allocates deliveryId and revision 0, creates `.aimship/state.json`, and generates `status.md`. Add that ID to the document information at the next save point. Identity/version/timestamps, documentDigests, identityHistory, retiredIdentities and legacyRunIds are managed; never supply them in a patch. `writeResult` is return metadata, not state input.

`documentPolicy.authority`: authored → prd.md; adopted → scope.md; editable → an explicitly authorized existing PRD containing this commission's complete scope/authorization/endpoint. `legacy` is migration-only. `interaction`, `prototypeCovered`, `interface` (none/http/other) and target `databases` IDs record artifact conditions. They do not select a preset route.

Register documents as `{kind,path,mode,version,assetRefs?}`. List local/repository prototype images, scripts and other review-relevant assets in assetRefs so their bytes participate in the document fingerprint; the Agent must identify the complete asset set. Kinds: prd, scope, tech-design, plan, testing, review, diagnosis, handoff, change-log, prototype, contract, sql, source. New formal Markdown follows the artifact map's root filename and ordered anchors. Reused files additionally need `basisRef` recording location/version/coverage/gaps and editability; unsupported content is explicitly not checked. New HTML prototype is prototype/index.html; register other agreed formats. HTTP contracts use openapi.yaml unless reused. SQL filenames follow database count. Source files are immutable adopted versions by workflow, not OS access controls.

## Update and inspect

```sh
node '<fixed-cli>' read '<delivery-dir>' --rules-version '<bound-version>'
node '<fixed-cli>' update '<delivery-dir>' --revision 0 --rules-version '<bound-version>' --input '<patch.json>'
node '<fixed-cli>' check '<delivery-dir>' --all --rules-version '<bound-version>'
node '<fixed-cli>' resume '<delivery-dir>' --rules-version '<bound-version>'
```

Objects merge, arrays replace entirely; null is literal, not deletion. `--input -` accepts stdin JSON. A revision conflict requires rereading and reconciling, not guessing a revision. Keep one writing session per delivery.

Stage runs are ordered `{id,stage,scope,progress,inputRefs,outputRefs}`. currentRun refers to one ID or null. Progress: planned/active/blocked/done; result: passed/failed/not-run/unknown/mixed; applicability: current/needs-review/unknown. Done requires a precise resultRef. Preserve past results in priorResultRef/historyResultRefs; do not delete started runs. Shared files never complete two runs automatically. Plan must complete before implementation; batch review, then overall review, then independent verify remains the agent's semantic responsibility.

New Markdown uses explicit `<a id="..."></a>` anchors. Definition metadata in the document supplies namespace/ID/version/status/refs; see document-patterns. REV and RUN additionally set `run` to the stageRun ID and use a result anchor such as `review.md#rev-001-v1` or `testing.md#run-001-v1`. Basic uniqueness, exact reference resolution, REQ→AC, AC→TC and RUN→TC versions are checked; prose truth, every-assertion coverage and object versions require Agent review. `nextIds` reports historical maxima plus one, including retired IDs. Keep historical definitions; retired identities cannot be reused.

References stay delivery-root-relative despite state being internal, or use `repo:<id>/<path>` / HTTP(S). Repository records `{id,path,role}` name actual absolute checkout/worktree roots. A branch is not a code version. Paths cannot escape roots through traversal or symlinks. check defaults to current inputs; --all adds registered history/decisions/outcomes. Exact fragments in registered new Markdown are checked; reused/remote/unsupported ones return not-checked. That does not establish semantics or passing verification.

Read/check/resume are read-only. They return view diagnostics and changed registered documents; matching revisions do not prove unchanged formal content. Resume canProceed is conservative structural readiness, never authorization or acceptance. Read returns conflicting layout candidates and unknown formats without rewriting them. `scan <material-root>` reads immediate delivery children in both layouts, deduplicates deliveryId and reports conflicting/unknown/inaccessible records. It neither scans unknown roots nor determines code-writing safety; inspect recorded roles/scopes and actual Git/worktree identity.

## State and view recovery

State writes are atomic per file and keep `.aimship/state.previous.json`. Across formal documents/state/status there is no transaction. First persist unfinished intent, edit and inspect documents, then save state. Managed document digests detect some external changes, never semantic equivalence.

A write returns the actual state revision and `writeResult: {stateSaved:true,revision,view}`. If view status is protected/error, the JSON is already saved. Do not replay the business patch; explicitly repair:

```sh
node '<fixed-cli>' render '<delivery-dir>' --revision '<saved-revision>' --rules-version '<bound-version>'
node '<fixed-cli>' render '<delivery-dir>' --revision '<saved-revision>' --rules-version '<bound-version>' --preserve-edits
```

The delivery identity, view digest and state revision are stored in `.aimship/view.json`; identity and revision must both match for a view to be current. Missing/stale views can be regenerated; modified or untrusted existing status is preserved in place by default. --preserve-edits first saves its full bytes to `.aimship/status-edits-<id>.md`, then rebuilds. Inspect the preserved intent and update formal authority separately. View text does not authorize acceptance, scope changes or publication. render does not increment state revision.

`recover <dir> --revision <backup-revision> --rules-version <bound-version>` restores only over missing/corrupt state, preserves corrupt bytes and advances revision. It refuses a valid or unknown state. Inspect actual effects afterward, never automatically repeat them. Remove only a stale task lock after confirming no writer exists.

## Explicit migration and rule adoption

Schema 1 root state remains readable; normal updates/adopt require migration first. Unknown schemas stay read-only. To migrate one selected old delivery, record a compatibility assessment and original/new artifact mapping:

```sh
node '<new-fixed-cli>' migrate '<delivery-dir>' --revision '<old-revision>' --rules-version '<new-version>' --input '<assessment.json>'
node '<new-fixed-cli>' adopt '<delivery-dir>' --revision '<returned-revision>' --rules-version '<new-version>' --input '<assessment.json>'
```

Both inputs are `{"compatibilityRef":"change-log.md#rules-switch"}`. Migration saves original state/recovery bytes under `.aimship/legacy/`, journals checksums in `.aimship/migration.json`, converts layout/schema and increments revision while retaining old rulesVersion. Interrupted migration resumes with the original parameters only after checksum checks; conflicting copies are preserved. Adopt separately records the assessed rule change. It does not convert business meaning.

Reconcile legacy documents by role, preserve original text/results/version basis, register reused files or create new forward-looking documents. Move evidence/host configuration only with mapped references and correct relative-link/workspace resolution. Never fabricate a past plan stage or tests. Unchanged completed historical execution records retain their old format, verified against the preserved migration target. Changing applicability alone does not rewrite that history. Planned or in-progress runs and any run whose execution facts change must satisfy current artifact contracts; an old ID is not an exemption. After adoption, legacy document policy still blocks stage/outcome advancement and resume readiness; reconcile documents and set the current policy first. Subsequent new runs follow the new mapping. Finished deliveries are never swept by install.

A compatible old fixed tool can checkpoint only next/checkpoint facts during version mismatch, once per active version. It cannot complete stages. Save before migration, reload new rules, migrate then adopt. Old tools must not write migrated schema 2. No DeliveryArc migration is provided.

Goal changes need a new goal.decisionRef; prior goals/outcomes are retained. A met goal requires goalConclusionRef; acceptance needs its own acceptanceRef. Merge and deployment refs remain independent. Reopening increments cycle, appends closureRefs and resets acceptance. See the [README](../README.md#update) for software lifecycle operations and the [Guide](guide.md#hosts) for host-discovery limits.

## Document review protocol

Schema 2 now includes `reviewPolicy: 1` and append-only `reviewHistory` (new deliveries default to both). Old states remain readable with `review-adoption-required`; at the recorded compatibility point enable the policy with an empty history, without inventing historical approval. Rule adoption and document approval remain separate. This additive protocol requires the current rules version; keep old tools bound to their old rules.

Each record has `{id, kind, document, version, digest, sourceRef, summary}`. Kinds are `self-check`, `approved`, `changes-requested`, and `editorial`. `self-check` requires `result: "passed"` or `"failed"`; only a passing self-check can support approval. `approved` additionally requires `decision: "explicit-approval"`; `editorial` requires `previousDigest`. Use unique local review-record IDs (for example `approval-1`); these are state record identifiers, not a replacement for REQ/AC/CHG. Send the complete preserved history plus new records through revision-checked `update`. Existing records cannot be edited, removed or reordered. The tool records `sourceDigest` from readable local or repo-relative evidence; keep it unchanged when sending history back. Evidence files are versioned/immutable: changed or missing evidence produces evidence-changed and does not release dependencies; preserve the original bytes and add new decisions in new evidence files. Evidence fragments use explicit anchors. A remote source must have a local preserved decision excerpt with its original locator and date.

`read`, `check`, and `resume` return `review.documents` with current `path`, `version`, `digest`, `selfCheck`, `approval` and status. First append a self-check of those exact bytes; after presenting the document and receiving explicit approval, append an approved record binding the same version/digest and the actual user message. Questions, silence, and “show the result” cannot be recorded as approval. A hash/source reference validates the record's content basis, **not user identity or authenticity**. Never synthesize a real approval to make an update pass.

Production `progress: done` may be saved while approval is pending. Starting/completing dependent runs is blocked until prerequisite completion and document approval are current. Runs default to depending on their predecessor; explicit `dependsOn: [preceding-run-ids]` supports recorded independent branches, while input/output producers and earlier selected development prerequisites also apply. The initial applicable development order is requirements/Scope, technical design, interface/SQL, test-design, plan, implement. Unselected stages are not created. Contract can produce only SQL when no interface change applies; technical design no longer requires SQL files before completion.

For new `plan.md` and `testing.md`, fingerprints cover the content before the fixed `execution` and `runs` anchors respectively. Append implementation and RUN/conclusion evidence after those boundaries. Reused formats and other documents use whole-file content; remote/binary or linked-asset semantic inspection still belongs to the host/Agent. `done`, matching hashes and structural checks do not prove semantic quality.

A material change needs an open CHG with impact/decision evidence, a revised document version, a new self-check and explicit reapproval. Old review records remain. Affected producer/dependent runs become `needs-review`; update currentRun/next to the re-review stop and restore applicability after evidence-backed rechecking in dependency order. Independent branches are preserved. An `editorial` record carries a prior approval only after a same-version self-check explains a formatting/typo change and references its previous digest; it is not a new user approval. Do not hide changed design in excluded result sections. Final `outcome.acceptance` stays independent.

See the [Agent review workflow](../skills/aimship/references/document-review.md) for presentation, automatic continuation after approval and compatibility responsibilities.
