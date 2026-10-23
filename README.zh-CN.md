# Aimship

[English](README.md)

Aimship 帮助你在 AI 编程工具中组织和推进开发任务，适用于功能开发、问题修复、技术重构和方案设计。

从提出需求到完成交付，Aimship 根据任务需要安排工作阶段，并保存需求、设计、进度和结果。需求发生变化时，相关资料随之更新；切换会话后，可以根据已有记录继续工作，减少重复解释背景和手动整理进度的负担。

每项任务在 `~/Aimship/` 下拥有独立的交付资料目录，代码保留在原仓库。你可以同时推进多个独立任务，也可以只委托其中的需求分析或设计工作。

## 安装

需要 Node.js 22+ 和 npm。通过 `--host` 选择宿主：`codex`、`cursor` 或 `claude-code`。

```sh
npx aimship@preview install --host codex
```

npm 已提供预览版。本源码为后续本地候选；源码或本地安装包的使用方式见[安装指南](docs/installation.md)。

多个项目和已接入宿主共用一份 Aimship，无需全局安装 npm 包。安装后开启新的宿主会话，并按实际需要授权访问交付目录和代码仓库。

## 使用

在宿主中选择 Aimship：Codex CLI 使用 `$aimship`，Cursor 和 Claude Code 使用 `/aimship`，随后描述预期结果：

> 使用 Aimship，为订单列表增加导出 Excel 的功能。

Aimship 会根据需求和已有资料帮助明确范围、安排工作。有具体限制时，可以在需求中补充，例如“本次只完成设计”。

在新会话中继续工作时，提供已有交付目录：

> 使用 Aimship 继续 `~/Aimship/order-export/` 中的任务。

切换宿主时使用同一交付目录，并分别完成访问授权。多个独立交付可以同时推进；同一次交付保持一个写入会话。同仓库与 worktree 的使用实例见[使用指南](docs/guide.md#work-on-two-requests-at-once)。

## 文档与反馈

- [安装指南](docs/installation.md)：宿主接入、更新、版本与状态查询、卸载及常见问题。
- [使用指南](docs/guide.md)：范围、阶段、变更、并行交付与会话交接。
- [工具协议](docs/cli.md)：供 Agent 与贡献者使用的状态及恢复命令。

预览版用于试用和收集反馈，宿主集成要求见安装指南。Bug 和功能建议请通过[GitHub Issues](https://github.com/clsx/aimship/issues) 提交；参与贡献请参阅[贡献说明](CONTRIBUTING.md)。

本项目采用 [MIT 许可证](LICENSE)。
