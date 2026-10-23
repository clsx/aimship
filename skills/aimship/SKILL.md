---
name: aimship
description: Guide an explicitly requested Aimship software delivery, or resume an existing Aimship delivery, from its recorded goal through the agreed stages and handoff.
disable-model-invocation: true
---

# Aimship

Activate only when the user explicitly asks to start or resume Aimship. Ordinary conversation does not create a delivery. Once activated, continue the same delivery across turns without asking the user to invoke every stage.

1. Run `"{{AIMSHIP_NODE}}" "{{AIMSHIP_LAUNCHER}}" bind` to resolve the installed version. Read the returned fixed-version core and CLI help. Use that fixed version's tools, carrying its rules version and the current state revision. If this is a source checkout rather than an installed entry, use `node bin/aimship.mjs bind` from the package root.
2. Read the core at the path returned by `bind`. Resolve all supporting links below against that same fixed release, even if a cached entry mentions an older path. [The shared core](references/core.md) is the source-checkout reference. For an existing delivery, read its state and the current goal/Scope plus only the next step's required references. Do not create a replacement delivery, reset its plan, or infer a new goal from “continue”.
3. For new work, use the binding’s configured `dataRoot` unless the user supplied a delivery location; do not infer it from the code root. Preserve the original request, identify the authorized endpoint and code locations, and propose the necessary ordered stages. After associating code scope, follow the core’s recorded-overlap check for independent deliveries. Existing explicit authorization and agreed arrangements remain valid. No answer is not acceptance. Create records only for an actual request.
4. Read the selected [stage reference](references/core.md#stage-references) when reaching it. Explain design choices and unresolved decisions, then continue authorized work. Only material missing facts or choices block their dependent work.
5. At stable results and before a manual session switch, save the state and give a short continuation prompt. Keep a compact binding: delivery ID, absolute delivery directory, state path, current run, rules version, and fixed core/tool paths. After compaction, reload these references if absent; do not assume the full skill survived.

Read [recovery and updates](references/recovery.md) on interruption, version mismatch or missing references; [sources and change flow](references/sources-and-changes.md) when adopting external material or revising reviewed work; [host access](references/hosts.md) only when access or host setup needs attention. Read [document patterns](references/document-patterns.md) when establishing the artifact arrangement or producing a document. New deliveries keep formal documents at the root, source/request.md under source/, and structured state under .aimship/; status.md is the generated reading entry. On resume use the actual statePath returned by read, inspect view/document-change warnings, and explicitly repair or migrate as described in recovery. Do not treat a generated view as editable authority.

The agent handles meaning, engineering and evidence. The local tools protect structure and writes; a successful command or a file's existence cannot establish goal completion. This skill does not schedule agents, open conversations, merge, deploy, or execute database changes by default.
