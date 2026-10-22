# Aimship

[中文](README.zh-CN.md)

Aimship helps you organize and carry out development tasks in AI coding tools. Use it to develop features, fix bugs, refactor code or prepare a design.

From the initial request to delivery, Aimship arranges the stages needed for the task and keeps a record of requirements, designs, progress and results. When requirements change, the relevant materials are updated. New conversations can continue from those records, reducing the need to explain the background again or organize progress notes manually.

Each task has its own delivery folder under `~/Aimship/`, while code stays in its repository. You can work on several independent tasks at once, or limit a task to requirements analysis or design.

## Installation

Requires Node.js 22+ and npm. Select a host with `--host`: `codex`, `cursor` or `claude-code`.

```sh
npx aimship@preview install --host codex
```

The npm command becomes available when the preview is published. For the current source or a local package, see the [installation guide](docs/installation.md).

Aimship shares one installation across projects and selected hosts. It does not require a global npm install. After installation, start a new host session and enable access to the delivery folder and code repositories as needed.

## Usage

Select Aimship in the host: `$aimship` in Codex CLI, or `/aimship` in Cursor and Claude Code. Describe the intended result:

> Use Aimship to add Excel export to the order list.

Aimship uses the request and available materials to clarify the scope and arrange the work. Include any specific limits in your request, such as “Design only for this task.”

To continue in a new session, provide the existing delivery directory:

> Use Aimship to continue the task in `~/Aimship/order-export/`.

Use the same delivery directory when switching hosts, with access authorized separately in each host. Multiple independent deliveries can progress at once; keep one writing session per delivery. See the [user guide](docs/guide.md#work-on-two-requests-at-once) for shared-repository and worktree examples.

## Documentation and feedback

- [Installation guide](docs/installation.md): host setup, updates, version and status queries, uninstall and troubleshooting.
- [User guide](docs/guide.md): scope, stages, changes, parallel deliveries and session handoff.
- [Tool protocol](docs/cli.md): state and recovery commands for agents and contributors.

The preview is intended for experimentation and feedback. Host integration requirements are described in the installation guide. Report bugs and feature requests through [GitHub Issues](https://github.com/clsx/aimship/issues). See [Contributing](CONTRIBUTING.md) to contribute.

Released under the [MIT License](LICENSE).
