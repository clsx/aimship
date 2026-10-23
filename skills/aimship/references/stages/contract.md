# Define interfaces

## Basis

Read the current requirements, technical design and existing engineering contracts.

## Work and result

Update/reuse the authoritative HTTP OpenAPI when applicable; create a delivery-local OpenAPI only if the engineering authority is absent. Specify operations, schemas, errors, compatibility and consumer expectations. Use appropriate formats for messages/non-HTTP interfaces. Link design and test requirements.

## Continue when

The cooperating parties have an unambiguous applicable contract consistent with the current requirements/design. No relevant interface change means this responsibility need not be selected.

## Decisions and blockers

A breaking interface/compatibility decision needs its proper authority. Missing consumers or schemas remain stated gaps, not fabricated agreements.

Use [the shared core](../core.md) for state, evidence and continuation rules. Record meaningful results in an artifact or referenced section; a file alone is not completion.

## Artifact contract

Use openapi.yaml or the registered authoritative contract. Follow [document patterns](../document-patterns.md) and the single [artifact map](../artifact-map.json). Keep this run independent even when its document is shared. New runs need a precise result location; adopted work is not a newly executed stage.
