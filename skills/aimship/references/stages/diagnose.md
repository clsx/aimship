# Investigate cause or feasibility

## Inputs

Read reported symptoms, expected behavior, relevant code/material and reproducible evidence, using the [shared project context and decisions](../core.md#project-context-and-decisions).

## Goal and scope

Investigate the commissioned uncertainty and distinguish confirmed causes, hypotheses and missing evidence.

## Actions

Investigate within authorized objects. Record observations, reproduction or supporting evidence, probable/established causes and remaining uncertainty. Keep incidental behavior changes out of a refactor.

If the apparent small fix expands into behavior or scope changes, explain the impact before dependent implementation.

## Outputs and result

Use diagnosis.md.

Only a commissioned independent investigation produces diagnosis.md. Known-cause bugs and normal development debugging stay within their current stage. Record an arrangement change before adding a mid-delivery investigation.

## Completion and stop

The investigation goal is met, or the inability to determine a cause and a concrete next step are accurately stated. A hypothesis is not a confirmed root cause.

Self-check the selected outputs and stop for their [current-content review](../document-review.md); unchanged supplied inputs follow the shared adoption rules. Production done is separate from approval.
