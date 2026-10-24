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

Register documents as `{kind,path,mode,version}`. Kinds: prd, scope, tech-design, plan, testing, review, diagnosis, handoff, change-log, prototype, contract, sql, source. New formal Markdown follows the artifact map's root filename and ordered anchors. Reused files additionally need `basisRef` recording location/version/coverage/gaps and editability; unsupported content is explicitly not checked. New HTML prototype is prototype/index.html; register other agreed formats. HTTP contracts use openapi.yaml unless reused. SQL filenames follow database count. Source files are immutable adopted versions by workflow, not OS access controls.

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

Goal changes need a new goal.decisionRef; prior goals/outcomes are retained. A met goal requires goalConclusionRef; acceptance needs its own acceptanceRef. Merge and deployment refs remain independent. Reopening increments cycle, appends closureRefs and resets acceptance. See the [user guide](guide.md#update) for lifecycle operations and their separate host-discovery limits.
