# Optional document patterns

Use only the needed sections and artifacts. These are prompts for useful content, not empty files to generate automatically. Small work may combine diagnosis, test design, review, verification and handoff in `results.md`, with distinct referenced sections.

**Requirements / Scope:** original request or adopted source; background; current goal and endpoint; included/excluded scope; authorized objects and constraints; requirements and acceptance criteria; source mapping; conflicts/decisions and open questions. Keep original input separate from revised current content.

**Technical design:** current requirement basis; engineering constraints; chosen structure and alternatives/tradeoffs; interface links; data and compatibility; failure/recovery; risks and open decisions. For database changes link the independent SQL and its dialect/version, existing schema basis and execution conditions.

**Plan:** batch ID and goal; requirement coverage; files/repositories and boundary; dependencies and interface; each batch review scope; overall review and independent verification. State tracks progress, so do not create a competing progress table.

**Verification plan:** requirement/risk → scenario and observable expected result; environment/data/tools; normal, error, boundary and relevant regression cases; known execution gaps. Keep missing-condition cases visible.

**Review record:** actor/source and date; exact objects/versions/differences; batch/overall/affected scope; requirements/design basis; findings, disposition and conclusion. A single-batch review explicitly covers both batch and overall responsibilities.

**Verification record:** actor/source and date; case version; tested code/build and environment; executed commands/operations; assertions and actual results; pass/fail/not-run/unknown; evidence locations; missing conditions and recovery action. Append a retest rather than rewriting the earlier failure.

**Change:** stable ID; reason and decision source; old/new meaning; affected artifacts/runs; remaining uncertainty; work completed and review/verification result. One important decision affecting several artifacts remains one record.

**Handoff:** current goal (and explicit revision if any); completed deliverables and links; how to use/check; actual review and verification scope; limitations/remaining work; goal achievement, acceptance, merge and deployment as separate facts; continuation if incomplete.
