# Aimship

[English](README.md) · [使用指南](docs/guide.zh-CN.md)

**Aimship 是一款面向 AI 开发工具的交付流程管理工具，帮助开发者组织从需求、设计到实施、审查和验证的工作。**

## Aimship 的核心能力

### 从需求到交付，按阶段组织工作

将需求、设计、实施、审查和验证串联为完整的交付流程，明确各阶段的目标、产出和衔接方式，让 AI 开发有清晰的推进顺序。

### 在本地留存并复用交付记录

将项目背景、需求方案、关键决策、执行进度和验证结果保存在本地，供你查阅，也为 AI 会话提供工作依据，支持会话切换、工作交接和后续迭代。

### 由你把握关键决策与推进节奏

在关键阶段审核方案、确认成果，再推进后续工作。需求或方案发生变化时，可以回到受影响的阶段调整，让你在 AI 执行过程中持续参与判断。

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

<a id="software-maintenance"></a>

## 安装与维护

首次安装按[快速开始](#install)操作。安装器支持 `codex`、`cursor` 和 `claude-code`；连接多个工具时重复 `--host`，例如 `--host codex --host claude-code`。无需全局 npm 安装、管理员权限或 npm 登录；npm 缓存需要可写。

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="升级与宿主管理"></a>
<a id="升级与-ai-开发工具管理"></a>
### 升级与工具管理

保存当前工作后，使用同一个安装命令：

```sh
npx aimship@latest install
```

已有工具登记、配置、自定义内容和交付文件都会保留。普通更新无需重复 `--host` 或 `--data-root`，没有后台自动升级。兼容更新后的会话操作见[升级后继续](docs/guide.zh-CN.md#guide-upgrade)。

本轮流程使用 **状态 schema 5／交付协议 2**，不接续或迁移协议 1 的状态，包括 Preview 17–20 的交付。旧文档仍可阅读，安装也会保留文件；请先用原支持版本完成进行中的交付，或按新流程新建交付。破坏性或未确认兼容的切换会在修改安装前显示简短中英双语说明，并在交互终端只确认一次：输入去除首尾空格后只有 `y` 或 `Y` 继续；其他输入（包括 `yes`）、直接回车、EOF 或 Ctrl+C 都取消，当前安装保持不变。非交互运行不等待输入，需要明确接受时使用[高级选项](#installation-troubleshooting)。确认只允许安装切换，不代表允许写入不支持的状态。npx 的下载确认与此独立；不要手改状态版本字段强行接续。

<a id="添加宿主"></a>
<a id="添加-ai-开发工具"></a>
接入另一个工具，保留已有登记：

```sh
npx aimship@latest install --host cursor
```

此操作也会安装当前推荐版本。找不到入口时查看 [AI 工具设置](docs/guide.zh-CN.md#guide-tools)。

<a id="installation-status"></a>

不下载、不升级，直接查询本机安装：

```sh
node "$HOME/.aimship/bin/aimship.mjs" --version
node "$HOME/.aimship/bin/aimship.mjs" status
```

`installedActiveVersion` 是实际生效的软件版本。健康检查涵盖受管理文件和配置，不能确认 AI 工具已加载 Skill。查看交付进度请打开该目录的 `status.md`。若使用自定义 `--home`，请使用该位置下的本机入口。

### 可选资料位置

首次安装可附加 `--data-root "./MyDeliveries"` 指定其他交付根目录。相对路径从执行目录解析。后续安装保留配置，不搬迁已有交付；这里是资料位置，不是代码仓库。

<a id="uninstall"></a>
### 卸载

断开一个工具并保留核心，或移除全部受管理软件：

```sh
npx aimship@latest uninstall --host cursor
npx aimship@latest uninstall
```

两条命令是不同操作，按需要选择。其他已登记工具需要的共享入口会保留；断开最后一个工具仍保留核心，完整卸载才移除稳定入口和受管理版本。两者都保留交付资料、用户代码、自定义文件与必要配置。修改过或不属于它管理的文件会保留并报告。之后刷新工具会话以清除缓存规则。

<a id="installation-troubleshooting"></a>
### 安装与升级问题

| 现象 | 处理方式 |
| --- | --- |
| 入口缺失或重复 | 按 [AI 工具设置](docs/guide.zh-CN.md#guide-tools)刷新发现；安装健康不代表已经加载。 |
| 管理位置被修改或占用 | 保留内容，明确处理归属或定制冲突后再试。 |
| 安装中断 | 查询 `status`，排除原因后在同一安装位置重跑完全相同的待恢复包，恢复途中不换版本。 |
| 版本与预期不一致 | 查询 `installedActiveVersion`，通过 `install` 更新，再刷新会话规则。 |
| 更新要求明确确认 | 先阅读影响说明，必要时完成旧交付后再升级。交互终端输入 `y` 或 `Y` 接受，其他输入取消；非交互时给相同目标包的 `install` 附加 `--accept-upgrade-risk` 才明确接受。不支持的交付状态仍不能写入。 |
| 下载失败或包不存在 | 检查包、确切版本和 registry；下载失败不算安装成功。 |

<details>
<summary>高级：指定包与恢复</summary>

将 `VERSION` 替换为实际已发布或待恢复的版本，例如 `npx aimship@VERSION install`。明确接受升级风险时，在这个确切命令后附加 `--accept-upgrade-risk`。`npx --yes` 只确认下载/运行包，不能代替兼容性确认。

已有本地安装包时，在其目录执行 `npx --offline file:./aimship-VERSION.tgz install --host codex`。源码与隔离安装检查见[贡献指南](CONTRIBUTING.md#isolated-installation-check)。

</details>

## 反馈与开发

[使用指南](docs/guide.zh-CN.md)涵盖审核、变更、接续与验收；[CLI 协议](docs/cli.md)供 Agent 和工具开发者查阅。开发与主动测试说明见[贡献指南](CONTRIBUTING.md)。

<a id="适用场景与示例"></a>
通过 [GitHub Issues](https://github.com/clsx/aimship/issues)反馈具体问题和建议，附最小复现，不公开私有交付数据。采用 [MIT 许可证](LICENSE)。
