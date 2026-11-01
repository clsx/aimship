# Aimship

[中文](README.zh-CN.md) · [Guide](docs/guide.md)

**Turn a requirement into a delivery you can review, follow and resume in your AI coding tool.**

Aimship is for developers who own the result, from a small fix to a feature spanning several repositories. Bring a goal and whatever materials you already have. The agent clarifies requirements, prepares designs, plans implementation batches, reviews the changes and records independent verification. You review the key documents and decisions before dependent work proceeds.

- **Understand the proposal before code changes:** requirements and acceptance criteria connect to the design, tasks and tests.
- **See what is actually finished:** `status.md` summarizes delivery stages; the plan tracks batch/task progress, reviews track findings, and tests retain actual results.
- **Continue without reconstructing the conversation:** saved documents, decisions and state give the next session a starting point. Changes return to the affected design and review.

Aimship manages the delivery process. The agent still needs to investigate, self-check and correct its work; you judge the content and acceptance. Model and AI-tool behavior can vary. **Currently in Preview**; installation or passing tool tests is not proof that every tool/model combination works.

[Start](#install) · [Example](#delivery-example) · [Upgrade](#update) · [Troubleshooting](#installation-troubleshooting)

<a id="quick-start"></a>
<a id="install"></a>
## Start a delivery

Requires **Node.js 22+ and npm**. Install for your AI tool:

```sh
npx aimship@latest install --host codex
```

Use `codex`, `cursor` or `claude-code` for `--host`. To connect several tools, repeat the option, such as `--host codex --host claude-code`. No global npm installation, administrator privilege or npm login is required; npm needs a writable cache. `latest` means the currently recommended version. Before the first formal release, it points to a Preview; the command stays the same afterward.

Refresh the tool's Skill discovery or start a new session, activate Aimship, then give it a concrete request. For example:

> Use Aimship to add CSV export for the selected orders in this dashboard. Keep the existing permission rules; help me clarify the requirements first.

You can start with an idea, a bug report, an existing PRD or a prototype. A complete specification and code checkout are not prerequisites. Aimship saves a separate delivery folder under `~/Aimship/` by default and gives you its location, current progress and next review action. Code stays in its existing location. Add the actual delivery folder to your workspace or grant access when your tool needs it.

<a id="start-a-delivery"></a>
<a id="getting-started"></a>
The [first-use guide](docs/guide.md#start) covers tool activation, access and the first review. Provide an existing delivery's directory to [continue it](docs/guide.md#continue).

<a id="delivery-example"></a>
## What you review along the way

**Illustrative example, not a completed customer delivery:** for the order-export request above, the documents could connect the following items. These excerpts show the organization, not executed test results.

| Document | Example of useful content |
| --- | --- |
| `prd.md` | REQ-001: export only selected orders; AC-001: selecting two permitted orders yields exactly those two rows. |
| `tech-design.md` / applicable contracts | Explain permission enforcement, export limits and error behavior before implementation. |
| `plan.md` | TASK-001 implements selection and permission checks; its execution status is maintained as batches finish. |
| `review.md` | Record the reviewed code baseline, findings, impact, fixes and recheck conclusion. |
| `testing.md` | TC-001 checks AC-001. Execution remains “not run” until a RUN records actual assertions and evidence. |
| `status.md` | Show the stable delivery stages, current review stop and next action; batch detail stays in the plan. |

<a id="what-a-delivery-contains"></a>
<a id="delivery-structure-and-documents"></a>
<a id="delivery-artifacts"></a>
<a id="delivery-workflow"></a>
A normal delivery follows **requirements → design and applicable contracts/SQL → test design → plan → implementation with batch reviews → overall review → independent verification → acceptance**. Documents are produced as needed. An applicable supplied PRD can be adopted; original materials are retained. A prototype is optional. Key approvals apply to the current content, and completion, passing tests and your acceptance remain separate facts.

See the [guided example](docs/guide.md#start) and [delivery directory reference](docs/guide.md#delivery-structure). Contributors can also [run synthetic deliveries](CONTRIBUTING.md#executable-examples) with actual local assertions; those checks do not establish AI-host behavior.

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="upgrades-and-host-management"></a>
<a id="upgrades-and-ai-development-tools"></a>
## Upgrade and manage tools

Save current work, then use the same installation command:

```sh
npx aimship@latest install
```

Existing tool registrations, configuration, custom content and delivery files are retained. Repeat neither `--host` nor `--data-root` for an ordinary update. There is no background updater. After upgrading, start a new session or refresh the tool's rules, activate Aimship and resume the same delivery directory.

Compatible delivery protocols can continue without rewriting old documents or invalidating unchanged approvals. Legacy Preview 17/18 states are supported by an exact protocol mapping; older unverified states are not assumed compatible. Software installation itself does not change delivery records. For a breaking or unverified protocol switch, the installer explains the impact and stops before changing the active installation. Strongly prefer finishing ongoing deliveries first; explicit risk acceptance is an [advanced recovery option](#installation-troubleshooting), not permission to write unsupported state. The npx download prompt is separate from that decision.

<a id="add-a-host"></a>
<a id="add-an-ai-development-tool"></a>
Connect another tool, retaining existing registrations:

```sh
npx aimship@latest install --host cursor
```

This also installs the currently recommended version. See [tool setup](docs/guide.md#hosts) if the entry is not discovered.

Check the local installation without downloading or upgrading:

```sh
node "$HOME/.aimship/bin/aimship.mjs" --version
node "$HOME/.aimship/bin/aimship.mjs" status
```

`installedActiveVersion` identifies the active software. Health checks cover managed files and configuration; they cannot confirm the AI tool loaded the Skill. For delivery progress, open its `status.md`. With a custom `--home`, use the launcher beneath that location.

### Optional material location

On the first installation, append `--data-root "./MyDeliveries"` to choose another delivery root. Relative paths resolve from the working directory. Later installs retain this configuration; existing deliveries are not moved. It is a material location, not a code repository.

<a id="uninstall"></a>
## Uninstall

Disconnect one tool while retaining the core, or remove all managed software:

```sh
npx aimship@latest uninstall --host cursor
npx aimship@latest uninstall
```

These are alternative operations. Shared entries remain when another registered tool needs them. Disconnecting the last tool retains the core; full uninstall removes the launcher and managed releases. Both retain delivery materials, user code, custom files and necessary configuration. Modified or unowned files are preserved and reported. Refresh tool sessions afterward to discard cached rules.

<a id="installation-troubleshooting"></a>
## Installation and upgrade problems

| Symptom | What to do |
| --- | --- |
| Entry absent or duplicated | Refresh discovery using [tool setup](docs/guide.md#hosts); installation health does not prove loading. |
| Managed path modified or occupied | Preserve the contents and explicitly reconcile ownership/customizations before retrying. |
| Interrupted installation | Inspect `status`, resolve the cause, then rerun the exact pending package against the same home. Do not switch versions during recovery. |
| Unexpected version | Query `installedActiveVersion`, use `install` to update, then refresh the session's rules. |
| Upgrade confirmation required | Finish ongoing deliveries first. If you explicitly accept the reported risk, rerun the same target package's `install` with `--accept-upgrade-risk`. Unsupported delivery writes remain blocked. |
| Download failed or package unavailable | Check the package, exact version and registry; download failure is not installation success. |

<details>
<summary>Advanced: exact packages and recovery</summary>

Replace `VERSION` with an actual published or pending version, for example `npx aimship@VERSION install`. If accepting an upgrade risk, append `--accept-upgrade-risk` to that exact command. `npx --yes` only accepts downloading/running the package and cannot substitute for this flag.

For an existing local package, run `npx --offline file:./aimship-VERSION.tgz install --host codex` from its directory. Source and isolated installation checks are in [Contributing](CONTRIBUTING.md#isolated-installation-check).

</details>

## Feedback and development

The [Guide](docs/guide.md) covers review, changes, continuation and acceptance; the [CLI protocol](docs/cli.md) serves agents and tool developers. Development and opt-in testing information is in [Contributing](CONTRIBUTING.md).

<a id="use-cases-and-examples"></a>
Share concrete problems and suggestions through [GitHub Issues](https://github.com/clsx/aimship/issues), with a minimal reproduction and no private delivery data. Released under the [MIT License](LICENSE).
