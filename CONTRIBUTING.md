# Contributing

This repository is standalone. Runtime, tests and packaging must not read a parent workspace or private planning material. Use synthetic fixtures and temporary user homes for installation tests; never test by overwriting real skills, configurations, delivery materials or business projects.

Node.js 22+ is the intended runtime floor. Run `npm test` for deterministic tool tests (one worker by default) and `npm run check:package` for distributable-content checks. `npm pack` creates a local package. There are no runtime third-party dependencies.

Keep agent workflow semantics in `skills/aimship/references`, deterministic file/state/install behavior in `lib`, and host entry handling thin. Changes should be driven by requirements or observed failures, with appropriate checks. Do not introduce route taxonomies, automatic agent scheduling, per-batch full testing gates, or a generic workflow platform.

A passing structural test does not prove agent behavior. Record actual host/version/model/permission conditions for behavioral checks; leave unavailable combinations unverified. Review affected changes and preserve historical failure evidence when retesting.

Use GitHub Issues for bugs and feature suggestions. Provide the version, host details and a minimal synthetic reproduction; redact credentials, personal paths and delivery data.

## Documentation

The English/Chinese README introduces the software delivery workflow, its value and outputs, and owns installation, upgrades, host management, version/health queries and uninstallation. The Guide owns the annotated delivery directory and document overview, and explains usage by scenario: starting from an idea, adopting materials, changing existing code, reading results, changing requirements, continuing and completing delivery. Avoid fixed prompt examples. Keep detailed artifact, stage and identifier rules in the bilingual [document reference](docs/reference.md). Keep both languages equivalent. Put source development and isolated validation procedures here, and agent/tool details in the [CLI protocol](docs/cli.md). Old installation/example URLs retain short compatibility pointers rather than duplicate command instructions.

Validate public links and the shared stage/template mapping with `npm run check:docs`. Treat [artifact-map.json](skills/aimship/references/artifact-map.json) and the [document rules](skills/aimship/references/document-patterns.md) as the mapping to check against; update user-facing explanations when that mapping changes.

<a id="isolated-installation-check"></a>
## Isolated installation lifecycle check

This is a contributor check of a package's installer and fixed launcher, not a required user setup sequence. For source development, run `npm pack` from the checkout to obtain a local tarball. Use a new candidate version when distributed content changes; do not replace an already released or installed version with different contents.

Place the package in the current directory and replace `VERSION` below. This POSIX shell example creates a disposable home and npm cache, runs from a separate consumer directory so npm cannot select the source checkout, and removes its temporary files on exit. Capture stdout outside the temporary directory if you need to retain evidence.

```sh
(
  set -eu
  package_file="file:$(pwd -P)/aimship-VERSION.tgz"
  trial=$(mktemp -d)
  trial=$(cd "$trial" && pwd -P)
  trap 'rm -rf "$trial"' EXIT
  mkdir "$trial/consumer"
  cd "$trial/consumer"
  run_package() {
    npx --yes --offline --cache "$trial/npm-cache" "$package_file" "$@" --home "$trial/home"
  }

  run_package install --host codex
  node "$trial/home/.aimship/bin/aimship.mjs" --version
  node "$trial/home/.aimship/bin/aimship.mjs" status
  run_package install --host cursor
  run_package uninstall --host cursor
  run_package status
  run_package uninstall
  run_package status
)
```

Inspect the JSON results: installation should activate the package version; the fixed launcher should report that same installed version and healthy files; adding Cursor should retain Codex; disconnecting Cursor should retain Codex and the core; full uninstall should leave no active release or registered hosts. The two `node` calls deliberately exercise the installed launcher independently of npx. Delivery data, custom files, modified files and upgrade/recovery behavior require separate fixtures and assertions; this smoke check does not cover them.

`--home` redirects managed installation files only. It does not make a running host discover that home or grant directory permissions. Never replace the disposable home with a real user home for validation. A successful lifecycle check does not establish real host discovery or cross-host continuation.

<a id="executable-examples"></a>
## Executable examples

The harness records explicitly labeled synthetic self-checks and approvals, exercises review stops before automatic continuation, and preserves CHG/reapproval history. These are deterministic tool checks, not real user decisions or host E2E evidence.

From a source checkout, run:

```sh
node scripts/run-examples.mjs <new-output-directory>
```

The output directory must not exist. The harness creates isolated code and delivery folders, exercises real functions with Node assertions, and saves readable documents, state and evidence. It does not install Aimship, touch user deliveries, access the network or publish anything. Do not use a real delivery as the output. The scripts are source-checkout tools, not installed user commands.

- **Authored, single batch:** a line-normalization PRD, plan before implementation, one review covering batch/overall scope, and independent normal/empty/error assertions. Execution updates the same plan; cases and RUN results share the testing document.
- **Adopted, multiple batches:** preserved catalog PRD/prototype inputs, Scope mappings, shared price validation and quoting with each batch reviewed. A discount change keeps case v1 and adds v2, updates earlier review applicability and binds exact code hashes. A deliberate rounding fault produces a failed RUN, followed by repair review and a successful retest while retaining failure history. Shared business rules, role restrictions and performance requirements have independent identities and acceptance.

These examples check local document/state behavior. They do not establish automatic Skill discovery, real cross-host continuation, UI interaction or HTTP acceptance. Run output records assertions and limitations. Results from older schemas do not establish current behavior.
