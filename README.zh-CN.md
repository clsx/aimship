# Aimship

[English](README.md) · [使用指南](docs/guide.zh-CN.md)

**面向 AI 工具的软件交付流程，贯通需求、设计、实施、审核与验证。**

你提供目标、已有资料和代码位置，Aimship 帮助 Agent 将需求整理为清晰的范围、有依据的设计、可执行的计划和经过验证的成果，并衔接各阶段的工作，让你能了解推进过程、理解关键决定、判断实际交付结果。

<a id="一个需求会留下哪些文档"></a>
<a id="交付目录与文档"></a>
<a id="交付成果"></a>
统一的文档大纲、编号和引用，将需求与验收标准关联到设计、实施任务、审核和测试结果。文档按交付目标和实际需要生成，既提供一致的阅读与核对依据，也不要求每个阶段都填一份空模板。

<a id="交付流程"></a>
默认由你逐份审核经过 Agent 自检的文档。Agent 给出文档、短摘要和下一步，等待你审核；明确通过后，按你的安排自动衔接下一授权阶段。提出修改意见时，Agent 修订、自检后重新送审。文档通过与最终交付验收分别记录。

文档与状态在工作过程中持续保存，使进度、决定和验证依据可追溯，减少重复交代背景和重新梳理已有工作的负担。

[安装](#install) · [使用指南](docs/guide.zh-CN.md) · [升级与 AI 工具管理](#update) · [卸载](#uninstall)

<a id="快速开始"></a>
<a id="install"></a>
## 安装

需要 **Node.js 22+ 和 npm**。以下命令使用 POSIX shell 写法。

### 安装已发布的预览版

```sh
npx aimship@preview install --host codex
```

AI 工具可选 `codex`、`cursor` 或 `claude-code`。连接多个 AI 工具时重复该选项：

```sh
npx aimship@preview install --host codex --host claude-code
```

按 npm 提示确认获取安装包。`@preview` 表示已发布的预览通道，也可以替换为明确版本号，例如 `@0.1.0-preview.7`。预览通道用于实验性版本，不代表稳定版。

### 指定版本或本地包

安装指定的已发布版本，例如：

```sh
npx aimship@0.1.0-preview.7 install --host codex
```

如果已有 Aimship 的 `.tgz` 安装包，将 `VERSION` 替换为实际版本号，在包所在目录执行：

```sh
npx --offline file:./aimship-VERSION.tgz install --host codex
```

选择一种安装方式即可。不需要全局 npm 安装、管理员权限或 npm 登录；npm 缓存需要可写。源码开发和隔离安装验证见[贡献指南](CONTRIBUTING.md#isolated-installation-check)。

### 可选：指定交付资料位置

默认交付资料根目录为 `~/Aimship/`。首次安装时，可以用 `--data-root` 指定其他位置：

```sh
npx aimship@preview install --host codex --data-root "$HOME/MyDeliveries"
```

此选项设置后续新交付的默认资料位置，不是代码仓库位置，也不会搬迁已有资料。后续安装保留已有配置；无需逐项目安装。

安装后，按[使用指南](docs/guide.zh-CN.md#hosts)在 AI 工具中选择 Aimship。AI 工具集成仍处于实验阶段，真实 Skill 发现和跨工具接续仍需验证。

<a id="update"></a>
<a id="update-or-stop-using-aimship"></a>
<a id="升级与宿主管理"></a>
<a id="升级与-ai-开发工具管理"></a>
## 升级与 AI 工具管理

升级到已发布的预览通道版本：

```sh
npx aimship@preview install
```

安装和升级使用同一个 `install` 命令。已有 AI 工具登记、配置、自定义内容和交付资料都会保留。安装器报告旧／目标版本、结果及冲突；没有后台自动升级或常驻进程。指定版本或本地包也使用[安装说明](#install)中的命令，指向原来的安装目录。

<a id="添加宿主"></a>
<a id="添加-ai-开发工具"></a>
### 添加 AI 工具

例如，已有 Codex 安装后再接入 Cursor：

```sh
npx aimship@preview install --host cursor
```

该命令保留已有 AI 工具，同时安装所选预览版本；如果预览通道有更新，也会升级软件。随后按[AI 工具设置](docs/guide.zh-CN.md#hosts)刷新对应会话。

### 查询已安装版本

```sh
npx aimship@preview --version
```

输出中的 `installedActiveVersion` 是当前已安装版本，`toolVersion` 是此次 npx 运行的包版本，两者可能不同。查询本身不会升级安装。

### 检查安装状态

```sh
npx aimship@preview status
```

此命令检查软件安装、AI 工具登记和受管理文件，报告是否健康及待处理问题；它不能确认 AI 工具已加载 Skill。查看需求进度请打开交付目录的 `status.md`。

以上命令由 npx 获取并运行所选包；日常交付由 Agent 使用固定的本地入口和规则，无需反复下载包。

升级后，先保存当前工作，再按[会话接续](docs/guide.zh-CN.md#continue)核对规则和交付状态；已有交付不会因为软件升级自动完成迁移。

<a id="uninstall"></a>
## 卸载

只断开一个 AI 工具，保留核心和其他 AI 工具登记：

```sh
npx aimship@preview uninstall --host cursor
```

其他已登记 AI 工具还需要的共享入口会保留。断开最后一个 AI 工具也保留核心，以便诊断或重新连接；兼容 AI 工具仍可能发现剩余的共享入口。

移除所有受管理的软件和 AI 工具入口：

```sh
npx aimship@preview uninstall
```

完整卸载保留交付资料、用户代码、自定义文件和必要配置。修改过或不属于它管理的文件会保留并报告。完全移除后，稳定入口也会移除；重启 AI 工具会话以清除缓存规则。删除交付历史是另一项需要明确提出的操作。

<a id="installation-troubleshooting"></a>
## 安装与升级问题

| 现象 | 处理方式 |
| --- | --- |
| 找不到 Aimship 或出现重复项 | 按[AI 工具设置](docs/guide.zh-CN.md#hosts)刷新会话并检查入口；安装健康不代表 AI 工具已经加载 Skill。 |
| 管理位置被修改或被其他文件占用 | 保留内容，检查归属，明确合并定制内容后再重试。 |
| 安装中断或稳定入口损坏 | 使用上面的 `status` 命令检查安装，排除原因后在同一目录重跑完全相同的待恢复版本；不要在恢复途中换版本。自定义安装用户目录可追加 `--home <安装用户目录>` 进行检查。 |
| 版本与预期不一致 | 核对版本查询中的 `installedActiveVersion` 和 `toolVersion`，继续交付前刷新会话中的规则。 |
| 包／版本不存在或下载失败 | 核对包名、明确版本和 registry；下载失败不算安装完成。 |

## 文档与贡献

<a id="适用场景与示例"></a>
**[使用指南](docs/guide.zh-CN.md)**说明如何开始需求、审核文档、查看成果、处理变更和接续。[交付文档参考](docs/reference.zh-CN.md)说明产物规则；[CONTRIBUTING](CONTRIBUTING.md)说明开发和隔离验证；[CLI 协议](docs/cli.md)供 Agent 和工具开发者查阅。

Aimship 目前处于预览阶段，流程、使用体验和兼容性仍在完善。欢迎通过 [GitHub Issues](https://github.com/clsx/aimship/issues)反馈实际使用中遇到的问题和改进建议；参与开发请先阅读贡献指南。

采用 [MIT 许可证](LICENSE)。
