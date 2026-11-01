# Shared review method

Fix the reviewed object first: requirements/design/plan basis, repositories, commit plus relevant differences/untracked files, or document sections/digests. Inspect only the commissioned scope and its dependencies. Review checks requirement/contract consistency, defects, omissions and code quality; it is not execution of the full testing plan.

Record a REV in review.md with scope/object, assessment and findings. A finding gives impact/severity, file/section/symbol, concrete problem, disposition and repair/recheck reference. If there are no findings, say so briefly; do not emit an empty issue table or implementation/test-command transcript. Reference existing evidence where it supports the conclusion.

Keep historical REV conclusions for their original objects. A passing recheck names the repaired object and explicitly references the conclusion it replaces; a failed or unexecuted check stays failed or unknown. Maintain one current conclusion and saved next action for the applicable object, rather than appending competing old instructions. Existing document-content approvals remain separate from code-review records.
