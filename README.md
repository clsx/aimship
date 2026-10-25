# Aimship

[中文](README.zh-CN.md) · [Guide](docs/guide.md)

**Aimship is a software delivery workflow for AI tools, connecting requirements, design, implementation, review and verification.**

For developers responsible for delivering a requirement. You provide the goal, existing materials and code locations. Aimship helps the agent turn them into a clear scope, a reasoned design, an implementation plan and verified results. It connects these stages so that you can follow the work, understand key decisions and assess what has actually been delivered.

<a id="what-a-delivery-contains"></a>
<a id="delivery-structure-and-documents"></a>
<a id="delivery-artifacts"></a>
Standard document outlines, identifiers and references connect requirements and acceptance criteria to designs, implementation tasks, reviews and test results. Documents are produced as needed for the delivery goal, giving you a consistent basis for review without requiring an empty template for every stage.

<a id="delivery-workflow"></a>
By default, you review documents individually after the agent's self-check. The agent presents current status, the document and review focus, then waits. After explicit approval is saved, work continues within the group; at a suggested session boundary it provides next work and a continuation entry, with the option to continue here; requested changes lead to revision, self-check and another review. Document approval remains separate from final delivery acceptance; an explicitly limited partial result is not presented as standard complete delivery.

Documents and state are saved throughout the work, keeping progress, decisions and verification evidence traceable and reducing the need to repeat background or reconstruct earlier work.

[Install](#install) · [Guide](docs/guide.md) · [Upgrade and AI tools](#update) · [Uninstall](#uninstall)

<a id="quick-start"></a>
<a id="install"></a>
## Installation

Requires **Node.js 22+ and npm**.

### Published preview

```sh
npx aimship@preview install --host codex
```

Choose `codex`, `cursor` or `claude-code`. To connect several tools, repeat the option:

```sh
npx aimship@preview install --host codex --host claude-code
```

Confirm npm's package installation prompt. `@preview` selects the published preview channel; an exact published version, such as `@0.1.0-preview.7`, can be used instead. The preview channel is experimental and does not imply a stable release.

### A specific version or local package

To install an exact published version, for example:

```sh
npx aimship@0.1.0-preview.7 install --host codex
```

If you already have an Aimship `.tgz` package, replace `VERSION` with its actual version and run from the directory containing it:

```sh
npx --offline file:./aimship-VERSION.tgz install --host codex
```

Choose one installation method. No global npm installation, administrator privilege or npm login is required; the npm cache must be writable. For source development and isolated installation checks, see [Contributing](CONTRIBUTING.md#isolated-installation-check).

### Optional: choose a delivery material location

The default delivery material root is `~/Aimship/`. On the first installation, use `--data-root` to choose another location:

```sh
npx aimship@preview install --host codex --data-root "./MyDeliveries"
```

The example uses a `MyDeliveries` folder under the current working directory; you can replace it with an absolute path to your preferred location. This sets the default material location for new deliveries. It is not a code repository location and does not move existing materials. Later installations retain the configuration; no per-project installation is needed.

After installation, follow the [Guide](docs/guide.md#hosts) to select Aimship in your tool. AI tool integrations are experimental: actual Skill discovery and continuation across AI tools still need validation.

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="upgrades-and-host-management"></a>
<a id="upgrades-and-ai-development-tools"></a>
## Upgrades and AI tools

For the published preview channel:

```sh
npx aimship@preview install
```

Installation and upgrades use the same `install` command. Existing tool registrations, configuration, custom content and deliveries are retained. The installer reports previous/target versions, results and conflicts; no background updater or resident process runs. For a specific version or local package, use the [installation commands](#install) against the original installation home.

<a id="add-a-host"></a>
<a id="add-an-ai-development-tool"></a>
### Add an AI tool

For example, connect Cursor after installing for Codex:

```sh
npx aimship@preview install --host cursor
```

This retains existing tools and installs the selected preview version; it also upgrades the software if the preview channel has advanced. Then refresh the relevant session as described in [tool setup](docs/guide.md#hosts).

### Check the installed version

```sh
npx aimship@preview --version
```

In the output, `installedActiveVersion` is the active installed version and `toolVersion` is the package npx is running. They may differ. This query does not upgrade the installation.

### Check installation health

```sh
npx aimship@preview status
```

This checks the software installation, tool registrations and managed files, reporting health and pending problems. It cannot confirm that a tool loaded the Skill. For delivery progress, open that delivery's `status.md`.

These commands use npx to obtain and run the selected package. During delivery work, the agent uses the fixed local launcher and rules without repeated package downloads.

After an upgrade, save current work and follow [session continuation](docs/guide.md#continue) to reconcile rules and delivery state. Upgrading the software does not automatically migrate existing deliveries.

<a id="uninstall"></a>
## Uninstallation

Disconnect one tool while retaining the core and other registrations:

```sh
npx aimship@preview uninstall --host cursor
```

Shared entries remain when another registered tool needs them. Disconnecting the last tool still retains the core for diagnostics or reconnection; compatible tools might continue discovering a remaining shared entry.

Remove all managed software and tool entries:

```sh
npx aimship@preview uninstall
```

Full uninstall retains delivery materials, user code, custom files and necessary configuration. Modified/unowned files are preserved and reported. The launcher is removed on complete removal. Restart tool sessions to discard cached rules. Deleting delivery history is a separate explicit action.

<a id="installation-troubleshooting"></a>
## Installation and upgrade problems

| Symptom | What to do |
| --- | --- |
| Aimship is absent or duplicated | Refresh the session and inspect entries using [tool setup](docs/guide.md#hosts); installation health does not prove the tool loaded the Skill. |
| A managed path is modified or occupied by other files | Preserve the contents, inspect ownership and explicitly reconcile customizations before retrying. |
| Installation was interrupted or the launcher is damaged | Use the `status` command above, resolve the cause, then rerun the exact pending version against the same home. Do not switch versions during recovery. Append `--home <installation-home>` when checking a custom installation home. |
| Unexpected version | Compare `installedActiveVersion` and `toolVersion`, then refresh the session's rules before continuing delivery work. |
| Package/version unavailable or download failed | Check the package, exact version and registry; a failed download is not a completed installation. |

## Documentation and contributions

<a id="use-cases-and-examples"></a>
The [Guide](docs/guide.md) explains how to start a delivery, review documents, inspect results, handle requirement changes and continue work. [Contributing](CONTRIBUTING.md) covers development and isolated validation; the [CLI protocol](docs/cli.md) serves agents and tool developers.

Aimship is in preview, with ongoing improvements to the workflow, usability and compatibility. Share problems and suggestions from actual use through [GitHub Issues](https://github.com/clsx/aimship/issues); read the contribution guide before contributing to development.

Released under the [MIT License](LICENSE).
