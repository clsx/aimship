# Aimship

[English](README.md) · [使用指南](docs/guide.zh-CN.md)

**在 AI 开发工具中，把一项需求推进为你能审核、跟进和接续的交付。**

Aimship 面向对交付结果负责的开发者，适用于小型修复，也适用于跨多个仓库的功能。你提供目标和已有材料，Agent 澄清需求、准备设计、安排实施批次、审查改动并记录独立验证；依赖这些方案的工作推进前，由你审核关键文档与决定。

- **改代码前看懂方案：** 需求与验收标准关联到设计、任务和测试。
- **看清实际完成情况：** 保存的状态提供交付阶段及当前批次、审查、测试摘要，文档保留工作定义、问题与详细证据。
- **换会话有据可接：** 保存的文档、决定和状态给下个会话提供起点；需求变化回到受影响的方案和审核。

Aimship 管理交付过程。Agent 仍须调查、自检和修正，你判断内容与验收结果。不同模型和 AI 工具的表现会有差异。**目前处于 Preview 体验阶段**；安装成功或程序测试通过，不代表所有工具/模型组合都已验证。

[开始使用](#install) · [示例](#delivery-example) · [升级](#update) · [排障](#installation-troubleshooting)

<a id="快速开始"></a>
<a id="install"></a>
## 开始一次交付

需要 **Node.js 22+ 和 npm**。为你的 AI 工具安装：

```sh
npx aimship@latest install --host codex
```

`--host` 可选 `codex`、`cursor` 或 `claude-code`。连接多个工具时重复选项，例如 `--host codex --host claude-code`。无需全局 npm 安装、管理员权限或 npm 登录；npm 缓存需要可写。`latest` 表示当前推荐版本，首次正式版前指向 Preview，之后命令也不变。

刷新工具的 Skill 发现或新建会话，启用 Aimship，再提供具体需求。例如：

> 使用 Aimship，给这个后台增加选中订单的 CSV 导出，保留现有权限规则，先帮我澄清需求。

可以从想法、缺陷报告、已有 PRD 或原型开始，不必先准备完整规格或代码仓库。Aimship 默认在 `~/Aimship/` 下保存独立交付目录，告诉你实际位置、当前进度及下一项审核操作。代码保留原位置。工具需要时，将实际交付目录加入工作空间或授予访问权限。

<a id="开始一次交付"></a>
<a id="使用入口"></a>
[首次使用指南](docs/guide.zh-CN.md#start)说明工具启用、访问权限及首轮审核。已有交付请提供原目录，按[续接说明](docs/guide.zh-CN.md#continue)继续。

<a id="delivery-example"></a>
## 过程中你会看到什么

**以下是结构示例，不是真实客户完成的交付：** 上述订单导出需求可以形成这些对应关系。片段展示内容组织方式，不代表测试已执行。

| 文档 | 有判断价值的内容示例 |
| --- | --- |
| `prd.md` | REQ-001：仅导出选中订单；AC-001：选择两条有权限的订单时，结果恰好包含这两行。 |
| `tech-design.md`／适用契约 | 实施前解释权限校验、导出限制及错误处理。 |
| `plan.md` | TASK-001 定义 B-001 中的选择与权限工作，生成表展示该批实施与审查进度。 |
| `review.md` | 记录审查代码基线、问题、影响、修复和复查结论。 |
| `testing.md` | TC-001 检查 AC-001；RUN 记录实际断言与依据前，执行状态保持“未执行”。 |
| `status.md` | 展示稳定交付阶段、当前审核停点与下一步；批次明细留在计划中。 |

<a id="一个需求会留下哪些文档"></a>
<a id="交付目录与文档"></a>
<a id="交付成果"></a>
<a id="交付流程"></a>
正常交付依次经过 **需求 → 技术设计及适用契约/SQL → 测试设计 → 计划 → 实施与批次审查 → 整体审查 → 独立验证 → 验收**。按实际需要产出文档；完整适用的已有 PRD 可直接采用，原件保留，原型按需选择。关键批准对应当前内容，阶段完成、测试通过与你的验收保持独立。

每批包含本批审查及授权内修复，闭环后停下。最后一批闭环后，Aimship 建议新开会话执行已有的整体审查阶段；你也可明确要求当前会话执行。整体审查后再正式测试，由你准备约定测试环境，不增加部署阶段或自动部署。

可查看[引导示例](docs/guide.zh-CN.md#start)及[交付目录参考](docs/guide.zh-CN.md#delivery-structure)。开发者还可[运行合成交付](CONTRIBUTING.md#executable-examples)，其中有真实本地断言，但不代表 AI 工具行为已验证。

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="升级与宿主管理"></a>
<a id="升级与-ai-开发工具管理"></a>
## 升级与工具管理

保存当前工作后，使用同一个安装命令：

```sh
npx aimship@latest install
```

已有工具登记、配置、自定义内容和交付文件都会保留。普通更新无需重复 `--host` 或 `--data-root`，没有后台自动升级。兼容更新后新建会话或刷新工具规则，启用 Aimship，继续原交付目录。

本轮流程使用 **状态 schema 5／交付协议 2**，不接续或迁移协议 1 的状态，包括 Preview 17–20 的交付。旧文档仍可阅读，安装也会保留文件；请先用原支持版本完成进行中的交付，或按新流程新建交付。破坏性或未确认兼容的切换会说明影响，并在修改活动安装前停止。明确接受风险是[高级选项](#installation-troubleshooting)，不代表允许写入不支持的状态。npx 的下载确认与此独立。

<a id="添加宿主"></a>
<a id="添加-ai-开发工具"></a>
接入另一个工具，保留已有登记：

```sh
npx aimship@latest install --host cursor
```

此操作也会安装当前推荐版本。找不到入口时查看 [AI 工具设置](docs/guide.zh-CN.md#hosts)。

不下载、不升级，直接查询本机安装：

```sh
node "$HOME/.aimship/bin/aimship.mjs" --version
node "$HOME/.aimship/bin/aimship.mjs" status
```

`installedActiveVersion` 是实际生效的软件版本。健康检查涵盖受管理文件和配置，不能确认 AI 工具已加载 Skill。查看交付进度请打开该目录的 `status.md`。若使用自定义 `--home`，请使用该位置下的本机入口。

### 可选资料位置

首次安装可附加 `--data-root "./MyDeliveries"` 指定其他交付根目录。相对路径从执行目录解析。后续安装保留配置，不搬迁已有交付；这里是资料位置，不是代码仓库。

<a id="uninstall"></a>
## 卸载

断开一个工具并保留核心，或移除全部受管理软件：

```sh
npx aimship@latest uninstall --host cursor
npx aimship@latest uninstall
```

两条命令是不同操作，按需要选择。其他已登记工具需要的共享入口会保留；断开最后一个工具仍保留核心，完整卸载才移除稳定入口和受管理版本。两者都保留交付资料、用户代码、自定义文件与必要配置。修改过或不属于它管理的文件会保留并报告。之后刷新工具会话以清除缓存规则。

<a id="installation-troubleshooting"></a>
## 安装与升级问题

| 现象 | 处理方式 |
| --- | --- |
| 入口缺失或重复 | 按 [AI 工具设置](docs/guide.zh-CN.md#hosts)刷新发现；安装健康不代表已经加载。 |
| 管理位置被修改或占用 | 保留内容，明确处理归属或定制冲突后再试。 |
| 安装中断 | 查询 `status`，排除原因后在同一安装位置重跑完全相同的待恢复包，恢复途中不换版本。 |
| 版本与预期不一致 | 查询 `installedActiveVersion`，通过 `install` 更新，再刷新会话规则。 |
| 更新要求明确确认 | 先完成进行中的交付。如果明确接受所述风险，给相同目标包的 `install` 附加 `--accept-upgrade-risk`。不支持的交付状态仍不能写入。 |
| 下载失败或包不存在 | 检查包、确切版本和 registry；下载失败不算安装成功。 |

<details>
<summary>高级：指定包与恢复</summary>

将 `VERSION` 替换为实际已发布或待恢复的版本，例如 `npx aimship@VERSION install`。明确接受升级风险时，在这个确切命令后附加 `--accept-upgrade-risk`。`npx --yes` 只确认下载/运行包，不能代替该参数。

已有本地安装包时，在其目录执行 `npx --offline file:./aimship-VERSION.tgz install --host codex`。源码与隔离安装检查见[贡献指南](CONTRIBUTING.md#isolated-installation-check)。

</details>

## 反馈与开发

[使用指南](docs/guide.zh-CN.md)涵盖审核、变更、接续与验收；[CLI 协议](docs/cli.md)供 Agent 和工具开发者查阅。开发与主动测试说明见[贡献指南](CONTRIBUTING.md)。

<a id="适用场景与示例"></a>
通过 [GitHub Issues](https://github.com/clsx/aimship/issues)反馈具体问题和建议，附最小复现，不公开私有交付数据。采用 [MIT 许可证](LICENSE)。
