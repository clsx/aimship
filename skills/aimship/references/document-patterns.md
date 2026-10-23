# Delivery documents and traceability

[artifact-map.json](artifact-map.json) is the shared mapping for stages, templates and checks. Use [templates](templates/prd.md) for newly authored documents; preserve section order and anchors, translate visible headings freely, and explain inapplicable sections. Templates are drafting guidance, not empty artifacts to generate for every delivery.

One request has one directory. Formal documents are at its root. `source/request.md` preserves the original commission or source entry; other adopted versions stay in `source/` without overwriting. State, recovery copies, necessary evidence and generated host configuration belong under `.aimship/`. Generated `status.md` is the reading entry; no default INDEX, docs/sql hierarchy, AI copy, transcript or full export. A requested export is a dated object/version snapshot, never an editing authority.

## Input and output conditions

Author current requirements in `prd.md`, including scope. Adopt an authoritative PRD/prototype through `scope.md`, preserving source/version/original IDs and gaps. Prior authorship does not make an adopted source editable. Only explicit maintenance of an editable authoritative PRD that completely expresses this commission's scope/authorization/endpoint permits registered reuse without another PRD/Scope. Scattered ideas/screenshots/reference cases are inputs to a PRD, not automatically authoritative requirements.

Interaction changes require a prototype when existing adopted material does not cover them and that work lies within the commissioned endpoint. New HTML uses `prototype/index.html`; register other agreed formats or reused entries. No interaction change means no invented prototype. Investigation/clarification-only requirements describe that commission and leave future development undefined.

`plan` must finish before first implementation, even one small batch. `plan.md` holds both planned TASK/B records and actual execution, distinctly; state holds stage progress. `testing.md` holds cases/coverage and appended RUN records; verification follows overall review. Verify-only may register existing cases with version/coverage, without claiming test-design occurred. Review-only does not require implementation/tests. No arbitrary small-task merging, `implementation.md`, `test-plan.md`, `verification.md`, or `results.md` for new work.

Use `tech-design.md`. HTTP changes use `openapi.yaml` or the registered engineering authority; no extra contract wrapper. Non-HTTP formats are explicitly registered. Database changes require independent `database.sql` (one target) or `database-<id>.sql` per target before tech-design completes. SQL headers identify target/dialect/version/schema basis/conditions; ordered sections cite requirements/design. Never substitute a Markdown block or migration reference, or execute/change migration mechanisms without authorization.

`diagnosis.md` belongs only to an explicitly selected independent investigation. Known-cause bugs and ordinary development debugging do not add diagnose. Major unknowns require a recorded stage adjustment; hold dependent work. Implementation defects go to implementation, design errors to design, requirement gaps to PRD/Scope, incorrect expectations to versioned cases.

## Identities and references

New local identities: REQ (type distinguishes functional, shared rule, permission, technical or quality), AC, B, TASK, TC, REV, RUN, CHG, Q, PAGE. Start at 001, increment after the historical maximum (including retired), never reuse an identity for another obligation. Shared rules, independent acceptance and single-role access/performance requirements must not disappear inside generic feature prose. Preserve external prefixes and source/version namespace. Splits/merges receive new identities and map old to new; classification changes retain identity.

One effective definition per namespace/ID; historical versions are explicitly labeled. Keep ordinary repeated citations as references, not duplicate definitions. New local Markdown uses explicit anchors and definition metadata beside the actual table row/section:

```markdown
<a id="req-001-v1"></a>
<!-- aimship:def {"id":"REQ-001","version":1,"status":"current","refs":["local:AC-001@1"]} -->
REQ-001 | functional | ... actual obligation and source ...
```

Optional `namespace` defaults to `local`; source identity may use `source-v1`. External IDs keep their original spelling (including nonnumeric forms such as `acceptance.login`); `:` and `@` are reserved reference delimiters. For an external ID without a recognized prefix, set `kind` to REQ, AC, B, TASK, TC, REV, RUN, CHG, Q or PAGE when its role is needed for coverage checks, for example `{"namespace":"source-v1","id":"acceptance.login","kind":"AC","version":1,"status":"current","refs":[]}`. Reference it as `source-v1:acceptance.login@1`; do not renumber the source. `status` is current/historical/retired. `refs` uses namespace:ID@version (no implicit latest). Put metadata at the single definition; table/Markdown citations elsewhere may repeat. Retain old TC definitions or necessary prior meaning and increment versions for semantic changes. RUN metadata cites exact TC versions; its prose binds code/build, actual command/assertion/result/evidence. Tools check metadata resolution and basic coverage; Agent checks whether it truly covers every assertion.

REQ/source → AC → design/operation/SQL, TASK → actual repository object → REV, and AC → TC@version → RUN@object. Relationships live in those documents, not a trace.md or a second state matrix. Q is defined once in the discovering document with impact/needed decision/status/source; resolving it also updates the affected formal authority, linked to one CHG if meaning changes. Old review/test facts remain; only affected current applicability becomes needs-review.

## Saving and checking

Register `documentPolicy` and `documents` per [CLI](../../../docs/cli.md). Draft at stage start; completion requires the mapped artifact and precise result anchor, not merely a filename. New Markdown anchors/metadata are machine-checkable; reused/remote/binary material needs recorded basis and explicit unchecked scope. Local references remain relative to delivery root even though JSON moved internally.

Save unfinished intent, update formal documents, inspect them, then revision-check state. A matching status revision does not prove documents unchanged. Read/check/resume diagnose only. A saved state with a failed view must be repaired using render at the returned revision, never replayed. Preserve hand-edited status before rebuilding and interpret intent against existing authority; it cannot confer acceptance or publishing permission.
