# Aimship

[中文](README.zh-CN.md) · [Guide](docs/guide.md)

**Aimship is a delivery workflow management tool for AI coding tools, helping developers organize work from requirements and design through implementation, review and verification.**

## Aimship’s core capabilities

### Organize work in stages, from requirements to delivery

Connect requirements, design, implementation, review and verification into a complete delivery workflow. Clear goals, outputs and handoffs for each stage give AI development a clear order of work.

### Keep and reuse delivery records locally

Save project context, requirements and proposals, key decisions, progress and verification results locally. These records are available for you to consult and give AI sessions a basis for work, supporting session changes, handoffs and later iterations.

### Keep key decisions and the pace of work in your hands

Review proposals and confirm results at key stages before moving forward. When requirements or proposals change, return to the affected stages and adjust them, keeping you involved in decisions as AI carries out the work.

Aimship helps organize the work; the agent still investigates, checks and corrects it, and you judge the proposals and acceptance. **Currently in Preview**: behavior varies by model and AI tool, and passing program tests does not establish every tool/model combination.

[Start](#install) · [Guide](docs/guide.md) · [Maintenance](#update)

<a id="quick-start"></a>
<a id="install"></a>
## Get started

Requires **Node.js 22+ and npm**. Install for your AI tool:

```sh
npx aimship@latest install --host codex
```

Use `codex`, `cursor` or `claude-code` for `--host`. `latest` is the recommended version and points to a Preview before the first formal release.

<a id="start-a-delivery"></a>
<a id="getting-started"></a>
<a id="delivery-example"></a>
<a id="what-a-delivery-contains"></a>
<a id="delivery-structure-and-documents"></a>
<a id="delivery-artifacts"></a>
<a id="delivery-workflow"></a>

See the [Guide](docs/guide.md#start) for activation, a complete delivery example, reviews and continuation; see the [delivery directory reference](docs/guide.md#delivery-structure) for document roles.

<a id="software-maintenance"></a>

## Installation and maintenance

For a first installation, use the [quick start](#install). The installer supports `codex`, `cursor` and `claude-code`. To connect several tools, repeat `--host`, for example `--host codex --host claude-code`. No global npm installation, administrator privilege or npm login is required; npm needs a writable cache.

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="upgrades-and-host-management"></a>
<a id="upgrades-and-ai-development-tools"></a>
### Upgrade and manage tools

Save current work, then use the same installation command:

```sh
npx aimship@latest install
```

Existing tool registrations, configuration, custom content and delivery files are retained. Repeat neither `--host` nor `--data-root` for an ordinary update. There is no background updater. For session steps after a compatible update, see [Continue after upgrading](docs/guide.md#guide-upgrade).

This workflow uses **state schema 5 / delivery protocol 3**. The revised native-document outlines are incompatible with protocol-1/2 states, including Preview 17–23 deliveries; this tool does not continue or migrate them. Their documents remain readable and installation preserves their files; finish ongoing deliveries with their supported version before upgrading, or start a new delivery under the new workflow. For a breaking or unverified switch, an interactive terminal shows a short bilingual explanation before installation changes and asks once: only `y` or `Y`, after trimming surrounding whitespace, continues. Any other input (including `yes`), Enter, EOF or Ctrl+C cancels and leaves the current installation unchanged. Noninteractive runs never wait for input; explicit acceptance uses the [advanced option](#installation-troubleshooting). Confirmation allows only the installation switch, never unsupported state writes. The npx download prompt is separate from that decision. Do not edit state version fields to force continuation.

<a id="add-a-host"></a>
<a id="add-an-ai-development-tool"></a>
Connect another tool, retaining existing registrations:

```sh
npx aimship@latest install --host cursor
```

This also installs the currently recommended version. See [tool setup](docs/guide.md#guide-tools) if the entry is not discovered.

<a id="installation-status"></a>

Check the local installation without downloading or upgrading:

```sh
node "$HOME/.aimship/bin/aimship.mjs" --version
node "$HOME/.aimship/bin/aimship.mjs" status
```

`installedActiveVersion` identifies the active software. Health checks cover managed files and configuration; they cannot confirm the AI tool loaded the Skill. For delivery progress, open its `status.md`. With a custom `--home`, use the launcher beneath that location.

### Optional material location

On the first installation, append `--data-root "./MyDeliveries"` to choose another delivery root. Relative paths resolve from the working directory. Later installs retain this configuration; existing deliveries are not moved. It is a material location, not a code repository.

<a id="uninstall"></a>
### Uninstall

Disconnect one tool while retaining the core, or remove all managed software:

```sh
npx aimship@latest uninstall --host cursor
npx aimship@latest uninstall
```

These are alternative operations. Shared entries remain when another registered tool needs them. Disconnecting the last tool retains the core; full uninstall removes the launcher and managed releases. Both retain delivery materials, user code, custom files and necessary configuration. Modified or unowned files are preserved and reported. Refresh tool sessions afterward to discard cached rules.

<a id="installation-troubleshooting"></a>
### Installation and upgrade problems

| Symptom | What to do |
| --- | --- |
| Entry absent or duplicated | Refresh discovery using [tool setup](docs/guide.md#guide-tools); installation health does not prove loading. |
| Managed path modified or occupied | Preserve the contents and explicitly reconcile ownership/customizations before retrying. |
| Interrupted installation | Inspect `status`, resolve the cause, then rerun the exact pending package against the same home. Do not switch versions during recovery. |
| Unexpected version | Query `installedActiveVersion`, use `install` to update, then refresh the session's rules. |
| Upgrade confirmation required | Read the impact and finish old deliveries first if needed. In an interactive terminal, enter `y` or `Y` to accept; anything else cancels. For noninteractive acceptance, rerun the same target package's `install` with `--accept-upgrade-risk`. Unsupported delivery writes remain blocked. |
| Download failed or package unavailable | Check the package, exact version and registry; download failure is not installation success. |

<details>
<summary>Advanced: exact packages and recovery</summary>

Replace `VERSION` with an actual published or pending version, for example `npx aimship@VERSION install`. If accepting an upgrade risk, append `--accept-upgrade-risk` to that exact command. `npx --yes` only accepts downloading/running the package and cannot substitute for compatibility confirmation.

For an existing local package, run `npx --offline file:./aimship-VERSION.tgz install --host codex` from its directory. Source and isolated installation checks are in [Contributing](CONTRIBUTING.md#isolated-installation-check).

</details>

## Feedback and development

The [Guide](docs/guide.md) covers review, changes, continuation and acceptance; the [CLI protocol](docs/cli.md) serves agents and tool developers. Development and opt-in testing information is in [Contributing](CONTRIBUTING.md).

<a id="use-cases-and-examples"></a>
Share concrete problems and suggestions through [GitHub Issues](https://github.com/clsx/aimship/issues), with a minimal reproduction and no private delivery data. Released under the [MIT License](LICENSE).
