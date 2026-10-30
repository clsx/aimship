# Aimship

[中文](README.zh-CN.md) · [Guide](docs/guide.md)

**Aimship is a software delivery workflow for AI tools, connecting requirements, design, implementation, review and verification.**

For developers responsible for delivering a requirement. You provide the goal and existing materials; code can be associated when needed. Aimship helps the agent turn them into a clear scope, a reasoned design, an implementation plan and verified results. It connects these stages so that you can follow the work, understand key decisions and assess what has actually been delivered.

<a id="what-a-delivery-contains"></a>
<a id="delivery-structure-and-documents"></a>
<a id="delivery-artifacts"></a>
Standard document outlines, identifiers and references connect requirements and acceptance criteria to designs, implementation tasks, reviews and test results. Documents are produced as needed for the delivery goal, giving you a consistent basis for review without requiring an empty template for every stage.

<a id="delivery-workflow"></a>
The agent organizes requirements, design, implementation and verification; you review key documents and important decisions. Feedback leads to revisions, and approval enables subsequent work. Final acceptance is based on the agreed goal and actual verification results.

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

The npx package prompt confirms downloading and running the package; `install` performs the Aimship installation or upgrade. `@preview` selects the published preview channel; an exact published version, such as `@0.1.0-preview.17`, can be used instead. The preview channel is experimental and does not imply a stable release.

### A specific version or local package

To install an exact published version, for example:

```sh
npx aimship@0.1.0-preview.17 install --host codex
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

<a id="start-a-delivery"></a>
<a id="getting-started"></a>
After installation, follow the [Guide](docs/guide.md#start) to prepare a workspace, activate Aimship and begin your first request. For an existing delivery, follow [continuation](docs/guide.md#continue).

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="upgrades-and-host-management"></a>
<a id="upgrades-and-ai-development-tools"></a>
## Upgrades and AI tools

For the published preview channel:

```sh
npx aimship@preview install
```

After upgrading, we recommend restarting your AI tool and opening a new session, then activating Aimship to reload the updated rules. Existing sessions may still retain older rules.

Installation and upgrades use the same `install` command. Existing tool registrations, configuration, custom content and deliveries are retained. The installer reports previous/target versions, results and conflicts; no background updater or resident process runs. To upgrade to a specific version, for example, run `npx aimship@0.1.0-preview.17 install`. Existing installations do not need `--host` or `--data-root` repeated.

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
node "$HOME/.aimship/bin/aimship.mjs" --version
```

This command queries the installed local launcher directly. `installedActiveVersion` is the active installed version. The query neither downloads a package nor upgrades the installation.

### Check installation health

```sh
node "$HOME/.aimship/bin/aimship.mjs" status
```

This checks the software installation, tool registrations and managed files, reporting health and pending problems. It cannot confirm that a tool loaded the Skill. For delivery progress, open that delivery's `status.md`.

These queries use the default installation location. If you installed with a different `--home`, use `.aimship/bin/aimship.mjs` under that location.

Save current work before upgrading. Afterwards, check the version and health with the commands above, and follow [session continuation](docs/guide.md#continue) to check delivery state when resuming work.

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
| Installation was interrupted or the launcher is damaged | Use the `status` command above, resolve the cause, then rerun the exact pending version against the same home. Do not switch versions during recovery. For a custom installation, use the local launcher under its original installation home. |
| Unexpected version | Query `installedActiveVersion` through the local launcher. To upgrade, run `install`, then check the version and refresh the session's rules. |
| Package/version unavailable or download failed | Check the package, exact version and registry; a failed download is not a completed installation. |

## Documentation and contributions

<a id="use-cases-and-examples"></a>
The [Guide](docs/guide.md) explains how to start a delivery, review documents, inspect results, handle requirement changes and continue work. [Contributing](CONTRIBUTING.md) covers development and isolated validation; the [CLI protocol](docs/cli.md) serves agents and tool developers.

Aimship is in preview, with ongoing improvements to the workflow, usability and compatibility. Share problems and suggestions from actual use through [GitHub Issues](https://github.com/clsx/aimship/issues); read the contribution guide before contributing to development.

Released under the [MIT License](LICENSE).
