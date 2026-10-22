# Local tool protocol

The agent normally runs these tools to handle file structure and version/revision checks, not business decisions. Cross-delivery overlap checking is an agent workflow using existing state and focused local Git metadata, not a CLI concurrency guarantee or a new registry. All commands emit JSON; errors include a code, message and recovery advice with a nonzero exit status. Run `node bin/aimship.mjs help` in a source checkout for the complete current interface.

## Bind and create

An installed entry invokes the stable `.aimship/bin/aimship.mjs` launcher. `bind` returns the active immutable release, core, stage directory, CLI path, rules version, configured material root and config/custom locations. Use the returned fixed CLI and version for this session. Paths in examples below are placeholders to replace with your actual paths, safely quoted for your shell.

```sh
node '<stable-launcher>' bind
node '<fixed-cli>' init '<delivery-dir>' --rules-version '0.1.0-preview.4' --input '<init.json>'
```

Before `init`, save the original request and current requirements/Scope in the actual delivery directory. `init` creates state once; it does not create requirement templates or infer authority. Minimal input:

```json
{
  "goal": {"summary": "Explain the selected design", "endpoint": "Design handoff"},
  "goalRef": "requirements.md",
  "stageRuns": [],
  "next": {"action": "Record the agreed stage arrangement", "inputRefs": ["requirements.md"]}
}
```

Identity, schema/rules version, revision and timestamps are tool-managed. Do not include them in init input. A useful arrangement contains distinct `stageRuns` with `id`, `stage`, `scope`, `progress`, `inputRefs`, and `outputRefs`. `currentRun` names one of them or is null. Associate repositories as `{id, path, role}` with an absolute actual checkout/worktree root. IDs are local to this delivery; they do not establish cross-delivery repository identity. Use role and current scope to distinguish read-only reference from intended code writes; record actual authorized scope and working basis in the associated requirements/evidence.

## Read, update and check

```sh
node '<fixed-cli>' read '<delivery-dir>' --rules-version '0.1.0-preview.4'
node '<fixed-cli>' update '<delivery-dir>' --revision 0 --rules-version '0.1.0-preview.4' --input '<patch.json>'
node '<fixed-cli>' check '<delivery-dir>' --rules-version '0.1.0-preview.4'
node '<fixed-cli>' resume '<delivery-dir>' --rules-version '0.1.0-preview.4'
```

Use the revision just read; a conflict requires rereading and reconciling. Updates recursively merge objects but replace arrays in full. `null` is a value, not deletion. `--input -` reads a JSON object from stdin. Completed stage runs need `resultRef`; retained old results use `priorResultRef` or `historyResultRefs`. Removing an already-started run or historical result reference is rejected.

References are delivery-relative, `repo:<id>/<relative-path>`, or HTTP(S) URLs, with optional fragments. Current checks inspect goal/next/current-input paths; `--all` also checks registered historical, decision, outcome, checkpoint and rule-change references. A file-existence result does not validate its fragment, contents or meaning. Remote references are not fetched by this tool. `resume.canProceed` is false for a recorded blocked current run, missing input paths or version mismatch. A true value only means these structural blockers were not found; the agent still checks authority, unresolved decisions and stage completion. Unknown schemas remain readable but cannot be overwritten.

`progress` is planned/active/blocked/done. Results are passed/failed/not-run/unknown/mixed; applicability is current/needs-review/unknown. `outcome.goal` is in-progress/met/not-met/unknown; acceptance is not-recorded/accepted/declined/unknown. A met goal requires a goal conclusion reference; acceptance requires its own decision reference. These are separate from merge/deployment references. The agent must assess the evidence; fields are not proof of success.

Changing the goal or goal reference requires a new `goal.decisionRef`; the tool preserves the old goal and outcome. Reopening increments `cycle` by one, retains a prior closure reference and resets current acceptance. Important changes remain in `openChanges` with stable ID/reference and open/closed status rather than disappearing when resolved.

## Recovery and rules adoption

Writes save `state.previous.json` and replace state atomically. If state is damaged, inspect actual artifacts and the backup before explicit recovery:

```sh
node '<fixed-cli>' recover '<delivery-dir>' --revision '<backup-revision>' --rules-version '<bound-version>'
```

Recovery preserves damaged bytes and refuses to roll back a valid or newer unknown state. It cannot reconstruct unrecorded effects. A stale lock requires confirming there is no active writer before removing only that lock. No parallel workflow scheduling is provided.

When an upgrade makes an old session mismatch, stop new stages. A compatible old tool can `checkpoint` only `{checkpoint: {summary, ref?}, next: {...}}` with its old rules version and current revision. It cannot complete a run or goal. Reload the active rules, inspect compatibility at a stable point, then use the active tool's `adopt` with input `{compatibilityRef: "results.md#rules-switch"}`. This records a rule switch without changing historical business facts. Schema 1 is the initial format; no legacy DeliveryArc migration or invented older Aimship migration is provided. Unsupported formats require a future supported migration and remain preserved meanwhile.

## Installation diagnostics

User-facing installation, explicit update, version/status and uninstall commands are documented in one [installation guide](installation.md). `install` performs software installation and updates; this protocol's `update` continues to mean a revision-checked delivery-state update.

`--version` distinguishes the CLI/tool version from the active installed release. Use the stable launcher for the current installation. `status` is read-only, inspects the known installation and managed entry files, and reports registration separately from entry integrity. It does not establish host loading, login, permissions or semantic delivery readiness. The key fields are `installation`, `healthy`, `installedActiveVersion`, `pending`, `registeredHosts`, `hosts`, and `issues`. Each host separates `registered`, `entryPresent`, `entryIntegrity`, `sharedWith`, `hostLoaded`, `login`, and `permissions`; the final three remain `not-verified`. `unselectedHostDiscoveryPossible` warns about compatible discovery. A diagnostic command may exit successfully while reporting `healthy: false`; inspect its data. `--version` includes `toolVersion` and `installedActiveVersion`, which may differ when called from an older release.

Installation transition results include previous and target versions; failures retain pending information for recovery. Disconnecting a named host retains the core, even when no registered hosts remain; full uninstall is a separate invocation without `--host`. Shared entries needed by another registration remain present. No purge-history command exists.
