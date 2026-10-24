# Contributing

This repository is standalone. Runtime, tests and packaging must not read a parent workspace or private planning material. Use synthetic fixtures and temporary user homes for installation tests; never test by overwriting real skills, configurations, delivery materials or business projects.

Node.js 22+ is the intended runtime floor. Run `npm test` for deterministic tool tests (one worker by default) and `npm run check:package` for distributable-content checks. `npm pack` creates a local package. There are no runtime third-party dependencies.

Keep agent workflow semantics in `skills/aimship/references`, deterministic file/state/install behavior in `lib`, and host entry handling thin. Changes should be driven by requirements or observed failures, with appropriate checks. Do not introduce route taxonomies, automatic agent scheduling, per-batch full testing gates, or a generic workflow platform.

A passing structural test does not prove agent behavior. Record actual host/version/model/permission conditions for behavioral checks; leave unavailable combinations unverified. Review affected changes and preserve historical failure evidence when retesting.

Use GitHub Issues for bugs and feature suggestions. Provide the version, host details and a minimal synthetic reproduction; redact credentials, personal paths and delivery data.

## Documentation

Users enter through the English/Chinese README and Guide. Keep both languages equivalent when changing installation, workflow or artifact rules. The Guide owns installation, usage, continuation, lifecycle and troubleshooting; old installation/example URLs retain short compatibility pointers. The [CLI protocol](docs/cli.md) serves agents and contributors.

Validate public links and the shared stage/template mapping with `npm run check:docs`. Treat [artifact-map.json](skills/aimship/references/artifact-map.json) and the [document rules](skills/aimship/references/document-patterns.md) as the mapping to check against; update user-facing explanations when that mapping changes.

<a id="executable-examples"></a>
## Executable examples

From a source checkout, run:

```sh
node scripts/run-examples.mjs <new-output-directory>
```

The output directory must not exist. The harness creates isolated code and delivery folders, exercises real functions with Node assertions, and saves readable documents, state and evidence. It does not install Aimship, touch user deliveries, access the network or publish anything. Do not use a real delivery as the output. The scripts are source-checkout tools, not installed user commands.

- **Authored, single batch:** a line-normalization PRD, plan before implementation, one review covering batch/overall scope, and independent normal/empty/error assertions. Execution updates the same plan; cases and RUN results share the testing document.
- **Adopted, multiple batches:** preserved catalog PRD/prototype inputs, Scope mappings, shared price validation and quoting with each batch reviewed. A discount change keeps case v1 and adds v2, updates earlier review applicability and binds exact code hashes. A deliberate rounding fault produces a failed RUN, followed by repair review and a successful retest while retaining failure history. Shared business rules, role restrictions and performance requirements have independent identities and acceptance.

These examples check local document/state behavior. They do not establish automatic Skill discovery, real cross-host continuation, UI interaction or HTTP acceptance. Run output records assertions and limitations. Results from older schemas do not establish current behavior.
