# Using Aimship

## Describe the work and its endpoint

Explicitly select Aimship and say what result you want, where the relevant materials/code are, and how far the agent may proceed. An existing clear instruction is enough; you do not need to prepare a complete PRD. A design-only goal may need no code repository.

The agent records the original request and current requirements/Scope, proposes the stages needed for this goal, and explains meaningful choices. Once the arrangement is accepted, it remains the execution order. You decide material business, scope, compatibility, cost or data choices; routine engineering choices do not require repeated approval. Silence does not approve an unanswered proposal.

Materials default to a delivery folder beneath `~/Aimship`, configurable at installation. Code remains in place, linked by repository identity and location in the delivery state. The material directory need not be the host's main workspace. Access is handled when an actual operation needs it; the agent must not silently move the materials or disable host controls.

## Work on two requests at once

You can keep `~/Aimship/notification-preferences/` and `~/Aimship/invoice-export/` active at the same time. Each has its own goal, stages and state, with one writing session per delivery. They may use different repositories or the same repository.

For example, request A is implementing in an app checkout while request B is designing invoice export using that code as a read-only reference. B may continue design after a brief overlap note. Before B writes code, the agent checks the recorded work again: if both would edit A's checkout, use your existing choice to implement sequentially or use a separate worktree/checkout. If B already has an isolated worktree, reuse it. Neither file isolation nor finishing B's branch means the changes are already merged or business-compatible. The handoff names the actual code directories, branch/commit, uncommitted work and pending integration.

When code scope is associated/changed, implementation begins or a working directory changes, the agent checks accessible delivery states in known material roots, including older unfinished deliveries rather than only recent ones. It reads focused Scope/plan sections only if needed. Ended deliveries are not counted as active writers; their pending integration may still be a dependency. Known shared interfaces, databases or test resources are arranged in the existing plan, even across different repositories.

This reports overlaps found in recorded deliveries. Stale records, inaccessible or unknown custom roots and work outside Aimship can hide overlaps. No matching record is not a guarantee of safety. There is no global lock, automatic worktree creation, agent scheduling or automatic merge; the agent preserves existing branches and unknown changes.

## Keep only useful artifacts

Each request has its own folder. Open `status.md` for the goal, stage progress, blockers, next action and artifact links. Formal documents live directly at the root, original adopted inputs in `source/`, and machine state/necessary evidence in `.aimship/`. No extra docs/sql layer or default full export is created.

Authoring requirements uses `prd.md` with scope included; adopting an authoritative PRD uses `scope.md` without rewriting the original. A concise task keeps the same outline. Implementation always has `plan.md` first, then records actual task execution in that file. `testing.md` combines cases and appended execution/retest records. `review.md` and `handoff.md` retain distinct responsibilities. Unselected stages produce no empty artifacts, while the source entry and commission basis always exist. See the [document rules and templates](../skills/aimship/references/document-patterns.md).

Only a commissioned independent investigation creates `diagnosis.md`; known-cause bugs and ordinary debugging do not. Interaction changes require a new prototype when adopted materials do not cover them. Technical design is `tech-design.md`; HTTP contracts use `openapi.yaml` or the registered authority. One database uses `database.sql`, multiple targets one `database-<id>.sql` each, prepared before design completes.

External PRDs, prototypes and images remain unchanged. Scope identifies their adopted versions, requirement mappings, conflicts and decisions. A link alone may not preserve a source version. Text extraction, visual inspection, browser interaction and original-format editing are different capabilities; the agent must identify missing parts.

Reuse existing engineering HTTP contracts. If database structures or data change, the design links a separate delivery-local SQL file with its dialect and conditions. SQL is a normal deliverable: generating it does not authorize changing migrations or running it.

## Review, verify and change

For multiple batches, implement and review each batch, review the integrated change, then execute the independent verification plan. Test code can be developed during implementation. A single review can cover both batch and overall scope for a single batch if the record says so.

Results identify the actual code/document version, scope, executor, environment and evidence. Review is not a runtime test. Missing accounts, tools or environments remain unexecuted checks with a concrete next action; they are not deleted to produce a passing report.

A meaningful change gets one record explaining reason, old/new meaning, decision and affected work. Editable requirements/design/contracts/SQL/tests are updated, affected conclusions are reviewed, and old evidence remains historical. Unrelated work is not reset. An implementation defect is fixed against the requirement, not hidden by weakening it.

## Continue in another conversation

At a stable phase or batch boundary ask for a handoff to a new conversation. The agent saves state, current facts, unresolved changes and next-step references, then supplies a short prompt with the absolute delivery path. Open the new conversation yourself and explicitly resume Aimship there. A different host uses that same directory and state; do not copy the materials. It needs its own authorized access to the material and code roots.

The new conversation uses read/resume to locate `.aimship/state.json` (or an unmigrated root state) and reads the needed current inputs. Read-only commands report missing/stale/modified status and changed formal documents. Explicit render repairs the view; preserve manual edits before rebuilding. View text alone never changes goals or acceptance. It does not need the entire chat, repeat agreed goals, or rerun every test. After compression it reloads missing rules and inputs using the saved binding. If the location is lost, provide the delivery path. Avoid concurrent writing sessions for the same delivery; independent deliveries can progress separately.

If a referenced repository moved, give the new location; the agent checks identity before repairing it. Interrupted operations need inspection of actual artifacts before continuation, especially operations with side effects. A revision conflict is reconciled, never force-overwritten.

## Update or stop using Aimship

Use the single [installation guide](installation.md) for commands, host reload differences and troubleshooting.

Explicitly install the desired local release/version using the same installer. Daily work uses fixed local files, not repeated `npx ...@latest` calls. Installation preserves customizations and delivery content, and reports conflicts with modified or unrelated skill files.

When a session's old rules differ from the current installation, finish saving current facts and switch at a stable point. Reload the new core/current stage, assess compatibility and adopt the new rules. If context cannot reliably refresh, resume the same delivery in a new conversation. For schema 1, explicitly migrate the selected delivery layout, then adopt the new rules, then reconcile its documents with recorded compatibility decisions. Original documents and historical results stay preserved; missing historical plans are not invented. Unknown formats remain read-only. Ended deliveries are not swept or rewritten during upgrade.

Uninstall through the stable launcher as documented in [the CLI guide](cli.md). It removes only confirmed managed files, retaining delivery materials, custom content and necessary configuration. Removing delivery data is a separate explicit action.

## Decide when work is done

The endpoint controls completion. A design commission ends with its agreed design; development includes its required validation. Asking to see current results does not shorten the goal. An explicit decision to end earlier preserves the original goal and outstanding work in the handoff.

Goal achieved, user acceptance, merge and deployment remain separate. Small later corrections can reopen the delivery while retaining its previous closure; a new goal or substantial redesign starts a related delivery. Aimship does not automatically manage parent/child work or multiple agents.
