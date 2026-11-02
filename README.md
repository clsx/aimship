# Aimship

[中文](README.zh-CN.md) · [Guide](docs/guide.md)

**Aimship is a delivery workflow management tool for AI coding tools, helping developers organize work from requirements and design through implementation, review and verification.**

## What Aimship helps you solve

- **You cannot tell what is actually finished.** Aimship separates work completed, review results, test results and your acceptance. The progress page points to current evidence and the next action.
- **A new session loses the thread.** Saved requirements, decisions and state give the next session a starting point, including pending reviews and unfinished work.
- **Important decisions get buried in the conversation.** The workflow brings key proposals to you for review before dependent work proceeds, and keeps valid approvals tied to the current content.
- **Plans, progress notes and results drift apart.** Stage and batch summaries share the same saved state; documents retain the detailed plans and evidence. Requirement changes return to affected designs and reviews.

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

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="upgrades-and-host-management"></a>
<a id="upgrades-and-ai-development-tools"></a>
<a id="add-a-host"></a>
<a id="add-an-ai-development-tool"></a>
<a id="uninstall"></a>
<a id="installation-troubleshooting"></a>
## Installation and maintenance

The guide covers [upgrades and compatibility](docs/guide.md#update), [adding tools](docs/guide.md#add-a-host), [checking installation](docs/guide.md#installation-status), [uninstalling](docs/guide.md#uninstall) and [installation problems](docs/guide.md#installation-troubleshooting). Check compatibility before upgrading an ongoing delivery; preserved files do not imply that every old delivery can continue under a new version.

## Feedback and development

The [Guide](docs/guide.md) covers review, changes, continuation and acceptance; the [CLI protocol](docs/cli.md) serves agents and tool developers. Development and opt-in testing information is in [Contributing](CONTRIBUTING.md).

<a id="use-cases-and-examples"></a>
Share concrete problems and suggestions through [GitHub Issues](https://github.com/clsx/aimship/issues), with a minimal reproduction and no private delivery data. Released under the [MIT License](LICENSE).
