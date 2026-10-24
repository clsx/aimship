# Aimship

[中文](README.zh-CN.md) · [Guide](docs/guide.md)

**A development workflow for AI coding tools, connecting requirements, implementation and verification.**

Aimship supports feature development, defect fixes, technical refactoring and solution design. It arranges stages around the delivery goal, maintains requirements, design, implementation and verification records, and supports continuation from existing materials.

Each request has an independent delivery directory under `~/Aimship/`, while code remains in its repositories. A commission can cover the full development workflow or specific outputs such as requirements analysis or technical design.

## Quick start

Requires **Node.js 22+ and npm**. Choose `codex`, `cursor` or `claude-code`:

```sh
npx aimship@preview install --host codex
```

Start a new host session and select Aimship: `$aimship` in Codex CLI, or `/aimship` in Cursor and Claude Code. Authorize access to the delivery folder and relevant repositories when needed, then describe the work:

> Use Aimship to add Excel export to the order list. The code is in my existing repository. Complete implementation and verification; leave deployment for later.

The npm command installs the published preview channel. For a specific version, source checkout or local package, see the [installation instructions](docs/guide.md#install).

One installation serves your projects and selected hosts. Host integrations are experimental: actual Skill discovery and cross-host continuation still need validation. See [host setup](docs/guide.md#hosts) if Aimship does not appear.

## Delivery workflow

1. **Establish the requirements.** Preserve original inputs, author a PRD or adopt existing requirements through Scope, and agree on the outcome and execution order.
2. **Prepare the work.** Produce the needed prototype, technical design, contracts, implementation plan and test cases.
3. **Implement and review.** Implement each batch and review it, then review the integrated change.
4. **Verify and hand off.** Execute the cases against the actual result, preserve failures and retests, and record the outcome and remaining work.

This outlines the development delivery process; not every request requires every stage. Design-only, review-only and verification-only commissions stop at their agreed endpoint. Ordinary debugging stays in the current workflow; a separate investigation stage is used only when explicitly arranged.

<a id="what-a-delivery-contains"></a>
## Delivery structure and documents

**`status.md`** is the delivery overview, with the current stage, blockers, next actions and document links. The tree below lists delivery artifacts and their purposes. Files are generated according to the selected stages and input conditions; unselected stages produce no empty documents. `prd.md` and `scope.md` are alternative requirement entries, not two files required for every delivery.

```text
~/Aimship/
├── 20261023-order-export/         # One request, one delivery folder
│   ├── status.md                 # Generated overview and reading entry
│   ├── prd.md                    # Authored requirements, scope and acceptance
│   ├── scope.md                  # Used instead of PRD when adopting authoritative inputs
│   ├── tech-design.md            # Architecture, changes, data, risks and requirement coverage
│   ├── plan.md                   # Implementation batches, tasks and actual execution
│   ├── testing.md                # Test cases, coverage, runs and retest results
│   ├── review.md                 # Batch/overall reviews, findings and follow-up
│   ├── handoff.md                # Delivered result, usage, validation and remaining work
│   ├── diagnosis.md              # Only for an independent investigation
│   ├── change-log.md             # Meaningful changes, decisions and affected work
│   ├── openapi.yaml              # New HTTP contract; reuse an existing authority when available
│   ├── database.sql              # SQL for one database; multiple targets use database-<id>.sql
│   ├── prototype/                # Newly authored prototypes when required
│   │   └── index.html            # Entry for an HTML prototype; its assets stay here
│   ├── source/                   # Preserved original request and adopted input versions
│   │   ├── request.md            # Original commission or source entry
│   │   └── …                     # External PRD, prototype, screenshots and other inputs
│   └── .aimship/                 # Managed state and supporting evidence
│       ├── state.json            # Stages, references, versions and repository/worktree links
│       ├── state.previous.json   # Previous state for recovery after writes
│       ├── view.json             # Metadata for the generated status view
│       └── evidence/             # Evidence retained when needed
└── 20261024-another-request/      # Independent request and progress
```

Formal documents are directly in the request folder. `source/` preserves adopted originals; `.aimship/` holds internal records. The software itself is installed separately in `~/.aimship/`.

Filenames, outlines and identifier rules come from shared templates. Requirements and acceptance criteria link to implementation tasks, reviews and versioned test cases/results. The [Guide](docs/guide.md#artifacts) explains exactly when each artifact is produced and what it contains.

## Use cases and examples

| Use case | Example request |
| --- | --- |
| Existing PRD and prototype | “Use these materials for order export. Preserve the originals and confirm the scope before implementation.” |
| Feature requirements and design | “Help define notification preferences and produce a prototype and technical design. Stop before implementation.” |
| Refactor | “Refactor the pricing module without changing observable behavior. Implement and verify it.” |
| Investigate a failure | “Investigate this intermittent timeout and report the cause and evidence. Do not implement a fix yet.” |

Independent deliveries can progress at the same time, with one writing session per delivery. When they share code, arrange sequential implementation or separate checkouts/worktrees. See [parallel work](docs/guide.md#parallel).

## Documentation and contributions

The **[Guide](docs/guide.md)** covers installation, daily use, document rules, continuation, updates and troubleshooting. For contributors, [CONTRIBUTING](CONTRIBUTING.md) covers development and checks; the [CLI protocol](docs/cli.md) is the agent/tool reference.

Report bugs and feature requests through [GitHub Issues](https://github.com/clsx/aimship/issues). Aimship is a preview; completed work, user acceptance, merge and deployment are recorded separately.

Released under the [MIT License](LICENSE).
