# Contributing

This repository is standalone. Runtime, tests and packaging must not read a parent workspace or private planning material. Use synthetic fixtures and temporary user homes for installation tests; never test by overwriting real skills, configurations, delivery materials or business projects.

Node.js 22+ is the intended runtime floor. Run `npm test` for deterministic tool tests (one worker by default) and `npm run check:package` for distributable-content checks. `npm pack` creates a local package. There are no runtime third-party dependencies.

The manual [Check Windows workflow](.github/workflows/check-windows.yml) runs the full tests and documentation/package checks on a standard Windows runner, sequentially across Node 22, 24 and 26. Select the intended commit's branch when dispatching and record the resolved commit and environment from the run. It uses isolated test homes, does not publish or install into a real user's configuration, and does not establish AI-tool integration coverage.

Keep agent workflow semantics in `skills/aimship/references`, deterministic file/state/install behavior in `lib`, and host entry handling thin. Changes should be driven by requirements or observed failures, with appropriate checks. Do not introduce route taxonomies, automatic agent scheduling, per-batch full testing gates, or a generic workflow platform.

A passing structural test does not prove agent behavior. Record actual host/version/model/permission conditions for behavioral checks; leave unavailable combinations unverified. Review affected changes and preserve historical failure evidence when retesting.

Use GitHub Issues for bugs and feature suggestions. Provide the version, host details and a minimal synthetic reproduction; redact credentials, personal paths and delivery data.

## Documentation

The English/Chinese README introduces the software delivery workflow, its value and outputs, and owns installation, upgrades, host management, version/health queries and uninstallation. The Guide owns the annotated delivery directory and document overview, and explains usage by scenario: starting without a requirements document, adopting materials, changing existing code, reading results, changing requirements, continuing and completing delivery. Avoid generic prompt tutorials; a contextual continuation entry belongs in the Guide. Keep stage mappings and document/identifier rules in the [shared agent references](skills/aimship/references/document-patterns.md); the Guide provides a brief explanation of traceability and retains user-facing [SQL and engineering version guidance](docs/guide.md#document-details). Keep both languages equivalent. Put source development and isolated validation procedures here, and agent/tool details in the [CLI protocol](docs/cli.md). Old installation/example URLs retain short compatibility pointers rather than duplicate command instructions.

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

## Preview releases

The [Publish preview workflow](.github/workflows/publish-preview.yml) is manually dispatched in `clsx/aimship`. It does not publish on push. Review and commit the versioned source, run tests and documentation/package checks, push the default branch and an exact `vX.Y.Z-preview.N` tag, then select that same tag as both the workflow ref and its `tag` input. The tagged commit must contain the workflow and matching `package.json` version. For example, with the GitHub CLI:

```sh
gh workflow run publish-preview.yml --repo clsx/aimship --ref vX.Y.Z-preview.N -f tag=vX.Y.Z-preview.N -f operation=publish
```

Validation runs on a GitHub-hosted runner without OIDC permission. It checks the release context, runs the full tests and documentation/package checks, and packs once. Every tarball member is compared with the source. The publishing job receives that exact artifact, rechecks its source and digest, and publishes `aimship` publicly to `https://registry.npmjs.org` with the `latest` tag, so a successful new publication makes that approved version the default immediately. After verifying the downloaded bytes and provenance, it synchronizes the compatibility `preview` tag and confirms both channels. `latest` is the default installation channel; pointing it at a preview version does not make that version stable. Actions and runner Node/npm versions are pinned in the workflow; these CI versions are not a replacement for the package's stated runtime requirements or a claim of cross-platform validation.

The npm package's trusted publisher must identify GitHub Actions, owner `clsx`, repository `aimship`, workflow filename `publish-preview.yml`, no environment, and allow direct `npm publish` and `npm dist-tag`. The tag permission is separate from publishing permission and must be explicitly authorized by the package owner; the workflow never changes the trust configuration. Tag operations require npm 11.21+ or 12.2+ (the workflow pins npm 11.21.0). Staged publishing is not used. No long-lived npm token is stored. Only jobs that publish or synchronize tags have `id-token: write`; validation has no OIDC permission, and all jobs have only `contents: read` for repository access. This is an ongoing publishing permission for that workflow, so changes to it deserve release-security review. A newly created npm trust must complete its first successful publication within npm's required window; see [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

On any uncertain publish result, inspect the registry and run logs before retrying. An existing version with different integrity stops the workflow; an identical version is verified without republishing. Missing provenance, unrecognized version formats, or a newer `latest` or `preview` version stops the operation. Direct publication under `latest` uses the existing publish permission; synchronizing `preview` or promoting an already published version requires the separate tag permission. A failed tag update may leave publication complete but channel synchronization pending; do not republish or create a replacement version. Preserve the run URL, commit, artifact digest and registry outcome. Create the GitHub prerelease separately after successful npm verification, using the same tag and validated package; the publishing workflow has no repository write permission. Do not reuse a released version for changed package contents.

To finish channel synchronization for an **already published, explicitly approved** release, run the current `main` workflow with `operation=sync-tags` and the original release tag:

```sh
gh workflow run publish-preview.yml --repo clsx/aimship --ref main -f tag=vX.Y.Z-preview.N -f operation=sync-tags
```

This operation never publishes a package or moves a Git tag. It compares the existing npm tarball with the original tagged source, checks its registry integrity and provenance availability, and updates only tags that do not already match. Each write is preceded by a fresh registry check; an old run cannot intentionally roll either channel back. The shared workflow concurrency group serializes these operations, but npm offers no compare-and-swap for changes made outside this workflow: avoid concurrent manual tag edits. On a denied or uncertain write, inspect the registry and logs before any authorized retry. Do not switch credentials or broaden trusted-publisher permissions automatically.
