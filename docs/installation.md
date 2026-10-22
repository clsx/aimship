# Installation and lifecycle

## Installation layout

Aimship installs fixed releases under `~/.aimship/` and a stable launcher at `~/.aimship/bin/aimship.mjs`. User configuration and custom content are separate from release files. A current release and at most one ordinary recovery release are retained; changed or unowned files are preserved and reported.

Choose `codex`, `cursor` or `claude-code` using repeatable `--host`. Registered hosts use one core and rules version. No per-project install, administrator privilege, npm global install, background updater or resident process is required. Source checkout, local tarball and registry examples all invoke this same installer; choose the appropriate source, do not stack them as separate host installations or add manual skill copies alongside managed entries. Installing software, connecting a host and starting a delivery are separate actions. Installation never creates `~/Aimship` or an empty delivery and never changes code repositories.

Node 22+ and npm are required. Installation and tool behavior have been checked on macOS arm64 with Node 24 and 26. Node 22 and other operating systems are not yet verified. Shell examples below use a POSIX shell. Preserve any existing installation before resolving conflicts.

## Source and local packages

From the source checkout:

```sh
node bin/aimship.mjs install --host codex
```

From the directory containing a supplied tarball:

```sh
npx --offline file:./aimship-0.1.0-preview.4.tgz install --host codex
```

Run these against your real home only when you intend to install. Repeat `--host` to connect multiple hosts in that operation. No login to npm is needed to consume a local tarball; npm still needs a writable cache. The installer reports the installation home, previous/target version, action/result, registered hosts and entry locations. A zero exit status is not proof that a host has loaded the skill.

### Isolated trial

These commands use one disposable installation and npm cache, not your real configuration. Put the candidate tarball in your current directory first:

```sh
trial=$(mktemp -d)
trial=$(cd "$trial" && pwd -P)
npx --yes --offline --cache "$trial/npm-cache" file:./aimship-0.1.0-preview.4.tgz install --home "$trial/home" --host codex
node "$trial/home/.aimship/bin/aimship.mjs" --version
node "$trial/home/.aimship/bin/aimship.mjs" status
node "$trial/home/.aimship/bin/aimship.mjs" install --host cursor
node "$trial/home/.aimship/bin/aimship.mjs" uninstall --host cursor
node "$trial/home/.aimship/bin/aimship.mjs" uninstall
```

`--home` redirects only Aimship's managed installation. It does not make the running host discover this home, log in, or inherit permissions. The installed launcher and fixed release CLI default later management operations to their own installation home. An explicit `--home` overrides that target. After inspection, the disposable directory can be removed by its owner; do not substitute a real home for this temporary variable.

## Registry installation after publication

This candidate has not been published. After the maintainer confirms the package identity and publishes this exact preview, the proposed initial command is:

```sh
npx aimship@preview install --host codex
```

The `preview` tag selects the preview channel. To select an exact version, replace `@preview` with its version number. Confirm the package installation when npm prompts. npm obtains the installer; it copies a complete local release, so subsequent use does not depend on that npm cache. Do not use an unversioned command and assume it selects the preview channel. A missing package/version is a distribution failure, not a successful installation.

## Host entry and reload

| Host | Managed entry | Explicit use | After install, update or disconnect |
| --- | --- | --- | --- |
| Codex | `~/.agents/skills/aimship/` with `agents/openai.yaml` | Select Aimship; CLI `$aimship` | Start a new conversation or restart the CLI, then inspect its actual skill selector. If stale, restart the app. |
| Cursor | Same `.agents/skills/aimship/` entry | `/aimship` | Start a new agent session; inspect Customize → Skills in the editor. Restart the host if the list remains stale. |
| Claude Code | `~/.claude/skills/aimship/` | `/aimship` | Start a new session and inspect slash-command discovery; restart the host if stale. |

These host integrations are experimental; end-to-end host behavior and cross-host continuation have not yet been verified. Check skill discovery and directory access in your host before starting a delivery. Each host needs its own authentication, model availability and permission to access materials and code. Do not disable permission controls or grant unrelated directories. No cloud synchronization is installed or enabled.

Codex and Cursor share the managed entry. Cursor also documents compatibility discovery from Claude/Codex directories. Aimship registers only selected hosts; it cannot guarantee that an unselected compatible host will not display an entry. If two same-name entries appear, inspect their paths and installation version rather than deleting unrelated files. Shared entry presence is distinct from registration, host discovery, login and permission. See the official [Cursor directories](https://cursor.com/docs/skills) and [Codex skill locations](https://learn.chatgpt.com/docs/build-skills).

After an update, a running conversation may retain old rules. Save current facts, reload the bound core and current stage at a stable point, and use the existing compatibility/adoption process; start a new conversation if context cannot reliably refresh. Version mismatch stops new workflow writes. Never infer that installation instantly changed an active conversation.

## Add a host, inspect and update

Reuse the installed core without fetching another package:

```sh
node "$HOME/.aimship/bin/aimship.mjs" install --host cursor
node "$HOME/.aimship/bin/aimship.mjs" --version
node "$HOME/.aimship/bin/aimship.mjs" status
```

Repeating the same install is safe for unchanged managed files. Adding a host preserves existing registrations. `status` reads Aimship's known installation files and managed entries; it does not scan projects or query host accounts. It separates registered hosts, missing/modified files, shared entries, pending installation and active version from unverified host capabilities. It is diagnostic, not a semantic delivery validator.

To update from a new local release, run that release's `install` command with the same installation home. No `--host` is necessary for an existing installation: registered hosts are retained, and a core whose last host was disconnected remains a core-only installation. After publication, the explicit preview-channel update is:

```sh
npx aimship@preview install
```

There is one installation/update operation: `install`. `update` in the low-level CLI modifies delivery state and is **not** a software updater. The installer reports old and target versions and the result, updates the shared core and selected entries, and preserves configuration, custom content and every delivery. Completed deliveries are not traversed or rewritten. No automatic update runs in the background.

## Disconnect or uninstall

Disconnect one host, leaving the core and other registrations usable:

```sh
node "$HOME/.aimship/bin/aimship.mjs" uninstall --host cursor
```

If another registered host needs a shared entry, that file is retained and reported. Disconnecting the last host retains the core so version/status and later host connection remain available. A compatible host may still discover an entry used by another host; this command does not change that host's settings.

Remove all managed programs and entries:

```sh
node "$HOME/.aimship/bin/aimship.mjs" uninstall
```

Full uninstall retains all delivery materials, user code, custom files and necessary configuration. Modified/unowned files are preserved and listed. No option purges delivery history. The launcher is removed on complete removal; inspect the returned result. Restart existing host sessions to discard cached rules.

## Troubleshooting and recovery

- **Foreign or modified entry/release:** read the reported path, keep its contents and resolve ownership or merge customizations explicitly. Do not force-overwrite it to obtain a successful exit status.
- **Partial installation:** `status` can identify pending work. Rerun the exact pending package against the same home after correcting the reported cause. Binding/new workflow writes remain suspended until recovery completes. Do not choose a different version mid-recovery.
- **Launcher unavailable:** run `node bin/aimship.mjs status --home <installation-home>` from the exact source/package installer. A missing launcher or damaged diagnostic module cannot diagnose itself. `status` reports facts without repairing them; only after inspecting the cause should you rerun the exact installer or reconcile retained files.
- **Unexpected version:** use the stable launcher for the installed active version. A CLI inside an older release can report a different tool version; reload the current binding before continuing. A source checkout is not automatically an installed release.
- **Package not found/authentication error:** confirm the exact package/version and public registry. Installation of a public release does not itself prove publish rights. Do not paste credentials into a bug report.
- **Skill absent or duplicated:** inspect the actual host selector and returned entry paths after reloading. A file check alone cannot diagnose host discovery; retain this as unverified until observed.
- **Directory denied:** authorize only the needed delivery/code roots in that host. Shared material storage does not share permissions. Report the exact denied operation rather than relocating user materials or changing security settings.
- **Different host/session:** explicitly resume the same absolute delivery directory and inspect state/current inputs. Do not copy materials, reset the goal or run two writers. See [the user guide](guide.md).

The initial data root can be selected with `--data-root` on installation. Existing configuration is retained on later installs; no language setting or second installation mode is introduced. Low-level state/version/recovery contracts are in [the CLI protocol](cli.md).
