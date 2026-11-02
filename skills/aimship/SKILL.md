---
name: aimship
description: Guide an explicitly requested Aimship software delivery, or resume an existing Aimship delivery, from its recorded goal through the agreed stages and handoff.
disable-model-invocation: true
---

# Aimship

Activate only when the user explicitly asks to start or resume Aimship. A clear request such as “use Aimship to start/continue” is explicit activation; a passing mention of its name or opening a project is not. In each new session, explicitly activate it again. Ordinary conversation does not create a delivery. Once activated, continue the same delivery across turns without asking the user to invoke every stage.

1. Run `"{{AIMSHIP_NODE}}" "{{AIMSHIP_LAUNCHER}}" bind`, then read the returned fixed-version [core](references/core.md) and CLI help. Use that release's tools and references. In a source checkout, run `node bin/aimship.mjs bind` from its package root.
2. Locate the same delivery and read its state, initialization notes and current materials. For new work, follow [initialization](references/core.md#initialization): preserve the commission in `.aimship/init.md`, use a separate directory under the bound dataRoot, and save the actual language and scope. A concrete request is enough; code and a PRD can come later. Resume existing work rather than initialize it again.
3. Use [routing](references/routing.md) to determine this turn's stage, actual scope and user-visible stop from the request and saved state. Load the selected [stage contract](references/core.md#stage-references), not every stage. Each has inputs, goal/scope, actions, outputs/result and completion/stop. Shared approval, change, source and recovery rules remain in their common references.
4. Execute that work unit within the commission. One implementation batch includes local checks, batch review and authorized repair/recheck; keep separate internal runs but do not ask for continuation between them. Stop at batch closure, a real dependency, a required document review, or the selected overall-review/verification boundary. After the last batch, save its implementation summary and recommend a new session for the existing overall review; continue it here only with explicit authorization. A request for overall review alone does not authorize full testing. Save actual content approval before dependent work; approval and continuation may be expressed together.
5. Report the saved directory, materials and next action using the core's User-facing updates guidance. On initialization, remind the user once to add the actual directory to the current project/workspace, ignoring the reminder if already added. On resume, preserve the delivery ID, current stop, language and fixed rule/tool paths; reload these if context is lost.


Read [recovery and updates](references/recovery.md) on interruption, version mismatch or missing references; [sources and change flow](references/sources-and-changes.md) when adopting external material or revising reviewed work; [AI tool access](references/hosts.md) only when access or tool setup needs attention. Read [document patterns](references/document-patterns.md) when establishing the artifact arrangement or producing a document. Formal documents and the complete progress view status.md stay at the delivery root; initialization notes and state stay under .aimship/, and adopted external materials under source/. On resume use the actual statePath returned by read, inspect view/document-change warnings, and explicitly repair supported state as described in recovery. Do not treat a generated view as editable authority.

The agent handles meaning, engineering and evidence. The local tools protect structure and writes; a successful command or a file's existence cannot establish goal completion. Session changes remain manual; engineering actions follow the actual commission.
