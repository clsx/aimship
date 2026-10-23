# Contributing

This repository is standalone. Runtime, tests and packaging must not read a parent workspace or private planning material. Use synthetic fixtures and temporary user homes for installation tests; never test by overwriting real skills, configurations, delivery materials or business projects.

Node.js 22+ is the intended runtime floor. Run `npm test` for deterministic tool tests (one worker by default) and `npm run check:package` for distributable-content checks. `npm pack` creates a local package. There are no runtime third-party dependencies.

Keep agent workflow semantics in `skills/aimship/references`, deterministic file/state/install behavior in `lib`, and host entry handling thin. Changes should be driven by requirements or observed failures, with appropriate checks. Do not introduce route taxonomies, automatic agent scheduling, per-batch full testing gates, or a generic workflow platform.

A passing structural test does not prove agent behavior. Record actual host/version/model/permission conditions for behavioral checks; leave unavailable combinations unverified. Review affected changes and preserve historical failure evidence when retesting.

Use GitHub Issues for bugs and feature suggestions. Provide the version, host details and a minimal synthetic reproduction; redact credentials, personal paths and delivery data.

Validate public links and the shared stage/template mapping with `npm run check:docs`. Run the isolated behavior examples with `node scripts/run-examples.mjs <new-output-directory>`; do not use a real user delivery as the output. Test results from older schemas do not establish current behavior.
