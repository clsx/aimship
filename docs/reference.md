# Aimship Delivery Document Reference

[中文](reference.zh-CN.md) · [Guide](guide.md) · [README](../README.md)

Use this reference to look up document generation conditions, stage outputs and identifier rules. Start with the Guide for everyday use.

Use the [annotated directory tree in the Guide](guide.md#delivery-structure) as the layout reference. Formal documents are directly in the request directory, new prototypes in `prototype/`, preserved inputs in `source/`, and machine records/evidence in `.aimship/`. There is no extra `docs/` or `sql/` layer within a delivery.

## Choose the requirement authority

| Input condition | Requirement document | Prototype handling |
| --- | --- | --- |
| An authoritative PRD/prototype is supplied for adoption | `scope.md` records adopted versions, scope, gaps, decisions and acceptance; originals remain unchanged | Reuse covered interactions; create a prototype for uncovered interaction changes within the commissioned endpoint |
| An idea, discussion, screenshots or scattered references | Author `prd.md`, including scope and acceptance | Create a prototype when the commissioned work changes interactions and existing material does not cover them |
| Technical refactoring or a known-cause fix | Author `prd.md` describing the technical goal, boundaries, behavior constraints and acceptance | No prototype when there is no interaction change |
| Independent investigation, review-only or verification-only | PRD/Scope defines that commission and its endpoint | Do not invent a future implementation or prototype |

`prd.md` and `scope.md` are alternatives for the requirement authority, not duplicate descriptions to create together. If you explicitly commission maintenance of an existing editable authoritative PRD and it fully expresses this delivery's scope, authorization and endpoint, register and reuse it. Earlier authorship alone does not make adopted material editable.

Preserve incoming versions in `source/`, including externally supplied PRDs, prototypes and images. Generated formal documents stay in the locations above. External originals are not rewritten when requirements change. A URL alone may not preserve a version; the agent records the available source/version and any access gaps. Reading text, inspecting a visual, interacting with a prototype and editing its original format are distinct capabilities.

## Stage outputs and content

Stage names are stable identifiers. This table is a catalog, not a fixed sequence; the accepted arrangement selects stages and dependencies. Every delivery retains the original request, a requirement/scope authority and state records, even when no separate requirements stage is needed. Sharing `plan.md` or `testing.md` does not complete both stages automatically: each stage retains its own status and result. Documents are drafted when their stage begins, and file creation alone does not establish completion.

| Stage | When used | Output and content |
| --- | --- | --- |
| `frame` | The problem or intended result needs clarification | Goal/background section of PRD/Scope: problem, outcome, non-goals and assumptions |
| `requirements` | Requirements need authoring or adoption | `prd.md`: goals, scope, requirements, states, acceptance and arrangement; or `scope.md`: source adoption, scope, exclusions, decisions, acceptance and arrangement |
| `scope` | Commission boundaries need explicit resolution | Update PRD scope or Scope goals/boundaries; no second requirements document |
| `prototype` | Required interaction changes are not covered by existing material | New HTML at `prototype/index.html` with related assets; other agreed formats or reused entries are registered |
| `diagnose` | An independent investigation is explicitly arranged | `diagnosis.md`: goal, symptoms, environment, evidence, causes, unknowns and conclusion |
| `tech-design` | Technical solution needs designing | `tech-design.md`: basis, architecture, modules, data/contracts, errors, risks and requirement coverage; SQL is produced and reviewed in contract after this design is approved |
| `contract` | Interfaces or database changes need formal artifacts | HTTP: `openapi.yaml` or the registered authority; agreed non-HTTP format; independent SQL per target, reviewed individually |
| `test-design` | Test cases need authoring | `testing.md`: basis, environment, cases/assertions and requirement/acceptance coverage |
| `plan` | Before any implementation, including one small batch | `plan.md`: basis, batches, tasks, validation approach, execution section and remaining work |
| `implement` | Execute the accepted plan | Code in its repositories; actual task status, objects and deviations in the same `plan.md` |
| `review` | Review a batch, the integrated result or a review-only commission | `review.md`: review basis, each review's scope/findings/resolution and conclusion |
| `verify` | Execute versioned cases after the required review, or a verification-only commission | Append execution batches/RUNs, actual results/evidence, retests and conclusion to the same `testing.md` |
| `handoff` | Deliver the agreed endpoint | `handoff.md`: goal, artifacts, usage, review/verification results, limits and completion/acceptance/integration outcomes |

During development, test-design precedes plan; each document follows the [review flow](guide.md#review-documents-and-continue). `plan` completes before the first implementation. Each implementation batch is reviewed, followed by overall review and independent verification. Test code can be authored during implementation; there is no full testing gate imposed after each batch. For one batch, one review may cover both batch and overall scope if explicitly recorded. Verification-only work may adopt existing versioned cases without claiming to have executed `test-design`.

Ordinary debugging and known-cause bugs do not add `diagnose`. Fix implementation defects in implementation, design errors in technical design, requirement gaps in PRD/Scope, and incorrect expectations in versioned cases. A major unknown requiring separate investigation needs a recorded stage adjustment; dependent work waits.

## SQL, changes and progress

| Artifact | Generation rule and content |
| --- | --- |
| `database.sql` | Required when database structures or data change; one database target uses this single root-level file |
| `database-<id>.sql` | Multiple independent database targets get one file each; use a stable target ID |
| `change-log.md` | Record meaningful changes: reason, old/new meaning, decision, affected documents/work and remaining actions |
| `status.md` | Generated reading entry: goal, progress, blockers, next action and document links |
| `.aimship/state.json` | Managed state: goal/stages, document references, version binding and associated repositories/worktrees/code locations |

SQL identifies the target, dialect, version/schema basis and execution conditions, and links ordered statements to requirements/design. It is prepared and individually reviewed in contract after technical design approval and before test cases. A Markdown SQL snippet or migration reference does not replace this deliverable. Generating SQL does not authorize executing it or changing a repository's migration mechanism.

Existing engineering HTTP contracts remain authoritative; avoid a second competing copy. Project current and target versions are recorded in PRD/Scope with their engineering source and observation basis; an unspecified version remains unspecified. `plan.md` records actual changes, while review and test results identify the exact commit/build or uncommitted content. Each repository has its own version and object references. These differ from Aimship’s rules version, state schema and save revision. The handoff records final code objects and actual merge/release status; a target version does not establish publication.

## Fixed outlines and traceable identifiers

New documents follow [shared templates and rules](../skills/aimship/references/document-patterns.md). Section order and stable anchors are retained; visible headings can be translated. Inapplicable sections explain why. Short tasks use the same outline, with shorter content. Unselected stages do not produce empty documents, and there is no arbitrary small-task merging.

| Identifier | Meaning |
| --- | --- |
| `REQ-001`, `AC-001` | Requirement and acceptance criterion |
| `B-001`, `TASK-001` | Implementation batch and task |
| `PAGE-001`, `Q-001` | Prototype page and tracked question |
| `TC-001`, `RUN-001` | Test case and actual verification run |
| `REV-001`, `CHG-001` | Review and meaningful change |

Each series starts at `001` and advances beyond its historical maximum, including retired items; three digits are the minimum width. An ID is never reused for a different obligation. Within a namespace and version, an identity has one effective definition; other documents reference it. Classification or layout changes retain the ID, while splits/merges create new IDs linked to the originals.

References connect requirements/acceptance to design, tasks, code objects, reviews, case versions and actual runs. These relationships may be many-to-many: `REQ-001` and `TC-001` are not related merely because their numbers match. Shared rules, permissions and quality requirements receive independent identities when independently testable. External IDs retain their spelling and source/version namespace; sources without IDs receive local mappings to their original locations. Changed case meaning gets a new version; earlier failures and their case/code versions remain traceable.

For example: `REQ-001 → AC-002 → TC-004@1 → RUN-003` records the explicit requirement-to-result relationship. A RUN also identifies the tested code/build and evidence; the case ID alone does not prove execution.

The tools check structure, references and basic coverage. The agent must still assess whether the content and assertions actually satisfy the requirement; valid metadata alone is not proof.
