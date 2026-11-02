# Aimship

[English](README.md) · [使用指南](docs/guide.zh-CN.md)

**Aimship 是一款面向 AI 开发工具的交付流程管理工具，帮助开发者组织从需求、设计到实施、审查和验证的工作。**

## Aimship 帮你解决什么问题

- **不知道到底完成了什么。** Aimship 分开展示工作完成情况、审查结果、测试结果和用户验收；进度页提供当前依据与下一步入口。
- **换个会话就要重新交代背景。** 保存的需求、决定和状态为下个会话提供起点，包括待审核内容和未完成的工作。
- **关键决定淹没在聊天里。** 流程把重要方案提交给你审核，再推进依赖这些方案的工作；有效批准与当前内容对应。
- **计划、进度记录和结果对不上。** 阶段与批次摘要共用保存的状态，文档保留详细方案和证据；需求变化回到受影响的设计与审核。

Aimship 帮助组织工作，Agent 仍须调查、检查和修正，你判断方案与验收结果。**目前处于 Preview 体验阶段**：不同模型和 AI 工具的表现会有差异，程序测试通过不代表所有工具与模型组合都已验证。

[开始使用](#install) · [使用指南](docs/guide.zh-CN.md) · [安装维护](#update)

<a id="快速开始"></a>
<a id="install"></a>
## 开始使用

需要 **Node.js 22+ 和 npm**。为你的 AI 工具安装：

```sh
npx aimship@latest install --host codex
```

`--host` 可选 `codex`、`cursor` 或 `claude-code`。`latest` 表示当前推荐版本，首次正式版前指向 Preview。

<a id="开始一次交付"></a>
<a id="使用入口"></a>
<a id="delivery-example"></a>
<a id="一个需求会留下哪些文档"></a>
<a id="交付目录与文档"></a>
<a id="交付成果"></a>
<a id="交付流程"></a>

启用方式、完整交付示例、审核与续接见[使用指南](docs/guide.zh-CN.md#start)，文档职责见[交付目录参考](docs/guide.zh-CN.md#delivery-structure)。

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="升级与宿主管理"></a>
<a id="升级与-ai-开发工具管理"></a>
<a id="添加宿主"></a>
<a id="添加-ai-开发工具"></a>
<a id="uninstall"></a>
<a id="installation-troubleshooting"></a>
## 安装与维护

指南提供[升级与兼容说明](docs/guide.zh-CN.md#update)、[添加工具](docs/guide.zh-CN.md#添加宿主)、[安装查询](docs/guide.zh-CN.md#installation-status)、[卸载](docs/guide.zh-CN.md#uninstall)及[安装排障](docs/guide.zh-CN.md#installation-troubleshooting)。升级进行中的交付前请先核对兼容性；文件保留不代表所有旧交付都能用新版本接续。

## 反馈与开发

[使用指南](docs/guide.zh-CN.md)涵盖审核、变更、接续与验收；[CLI 协议](docs/cli.md)供 Agent 和工具开发者查阅。开发与主动测试说明见[贡献指南](CONTRIBUTING.md)。

<a id="适用场景与示例"></a>
通过 [GitHub Issues](https://github.com/clsx/aimship/issues)反馈具体问题和建议，附最小复现，不公开私有交付数据。采用 [MIT 许可证](LICENSE)。
