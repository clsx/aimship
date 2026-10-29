# Implement one batch

## Basis

Read this run’s scope, current requirements/design/contracts, relevant repository instructions and pre-existing changes.

## Work and result

Before entering implementation, or when a code working directory changes, apply the [recorded-overlap check](../core.md#independent-deliveries-and-recorded-overlap). Reuse an existing user-selected sequence or isolated checkout; unresolved same-checkout writing overlap holds the affected code writes, not independent design work. Complete this batch using the existing engineering stack. Write planned test code where appropriate. Preserve user work and external sources. Record deviations and route semantic changes through the current authority, including SQL when affected. Engineering commands use the repository working directory.

## Continue when

The planned batch is implemented and known deviations are resolved or explicitly routed. After saving and the user’s continuation, move to this batch’s review; running a complete test suite is not a new batch gate.

## Decisions and blockers

Expanded external behavior, data handling or authorization needs return to the relevant decision. A rejected permission remains blocked and is not retried through another host.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use plan.md. Preserve the ordinary template headings and section order. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.

Update TASK/B status and actual execution in plan.md's execution section, citing the existing task/batch numbers. Keep approved task definitions unchanged unless the plan itself changes; preserve planned versus actual and code versions. Do not generate implementation.md.

After completing and self-checking this stage, save its result and current stop. Report the artifacts and next action, then stop. Wait for continuation without adding a document approval; final handoff instead awaits the actual acceptance decision. Failures remain unresolved until repaired and checked.
