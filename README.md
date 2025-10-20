# Linux.do 收藏增强 Edge 扩展 PRD

## 概述
本项目旨在为 [linux.do](https://linux.do) 站点开发一款 **Microsoft Edge 扩展（Manifest V3）**，在用户的「收藏帖子」页面（`https://linux.do/u/*/activity/bookmarks`）插入一个 **macOS 风格的悬浮窗面板**。扩展需自动抓取用户全部收藏（含分页），并通过“原生标签 + 预制标签 + 用户自定义标签”的三层体系与 AI 分类实现**多选（AND）筛选**和**标题即时搜索**。所有数据与配置均在用户本地持久化保存。

> 当前仓库仅存放产品需求文档（PRD），暂未进入开发阶段。

## 核心体验
1. **悬浮窗 UI**：快捷键 `Ctrl/⌘ + K` 打开/关闭，右上角可最小化，可拖拽移动。列表采用虚拟滚动，单行展示标题、作者、时间、原生/AI/自定义标签以及“编辑标签”入口。
2. **全量收藏抓取**：进入收藏页后自动并发抓取所有分页帖子详情，优先调用 Discourse JSON 接口，失败时回退 DOM 解析。抓取信息包括标题、作者、链接、时间、原生标签、正文内容或摘要等。
3. **三层标签体系**：
   - 原生标签：直接读取站内标签，始终保留。
   - 预制标签：作为冷启动标签库，可配置启用状态但不可改名。
   - 用户自定义标签：支持增删改、合并、启停。手动编辑的帖子将被锁定，AI 不再覆盖。
4. **AI 多标签分类**：以“候选标签”数组作为唯一选择集合，调用用户配置的模型返回严格 JSON 数组结果；支持批处理、失败重试与“待定”标记。正文超限时先截断或摘要。
5. **本地持久化与导入/导出**：使用 IndexedDB 存储帖子、标签、分类结果与索引；使用 `chrome.storage.local` 存储配置与轻量状态，并申请 `unlimitedStorage` 权限。提供 JSON 导入/导出并支持脱敏选项。
6. **性能与健壮性**：抓取与 AI 调用均具备并发控制、超时设置与指数退避；渲染过程渐进，正文与标签补全异步进行；记录分页游标以支持断点续扫。

## 架构组件
| 组件 | 职责 |
| --- | --- |
| Content Script | 在匹配页面注入悬浮窗 UI，发起同源抓取并解析页面数据，负责与后台进行消息通信。 |
| Service Worker | 管理数据持久化、AI 调用调度、失败重试、索引维护与版本迁移。 |
| Options 页面 | 提供配置入口：API Base、API Key、模型名、并发/超时、正文上限、关键词簇等。 |
| Commands | 注册快捷键 `Ctrl/⌘ + K`；`Esc` 最小化；`/` 聚焦搜索框。 |

## 权限与 Manifest 要点
- `host_permissions`: `https://linux.do/*`；AI 接口域名放入 `optional_host_permissions`（首次配置时提示授权）。
- `permissions`: `storage`, `scripting`, `activeTab`, （可选）`cookies`, `downloads`（用于导出）。
- CSP：允许已授权 AI 域名的 `connect-src`。
- 利用 `declarativeContent` 在匹配页面启用脚本。

## 数据模型草案
- **Post**: `id`, `title`, `author`, `url`, `createdAt`, `updatedAt`, `favoriteAt`, `nativeTags[]`, `body`, `hash`
- **Classify**: `postId`, `aiTags[]`, `userTags[]`, `locked`, `modelSignature`, `ts`
- **TagDict**: `preset[]`, `user[]`（含 `name`, `enabled`, 可选 `weight`）
- **Settings**: `apiBase`, `apiKey`, `model`, `fetchConcurrency`, `aiConcurrency`, `timeout`, `bodyCharLimit`, `enableKeywordClusters`, `hotkey`, `storagePolicy`
- **Index**: `pageCursor`, `scannedPostIds[]`, `failedQueue[]`, `version`

## AI 工作流
- **输入**：`{candidate_tags[], post_title, post_body}`，可附加 `notes`（如原生标签、语言）。
- **约束**：System 提示要求模型只能从 `candidate_tags` 勾选 0..N 个标签，并返回纯 JSON 数组。非 JSON 输出将自动重试一次；仍失败则标记为“AI 待定”。
- **兼容性**：遵循 OpenAI Chat/Responses API 协议，可配置额外请求头、并发度、重试策略；正文超限可先截断或摘要。

## 默认配置建议
- 抓取并发：4
- AI 并发：2
- 请求超时：20 秒
- 正文上限：8,000 字
- 关键词簇：默认启用（只读辅助筛选）
- 排序：收藏时间倒序
- 存储策略：IndexedDB + `unlimitedStorage`

## 预制标签初始集合
技术教程、环境搭建、故障排查、性能优化、安全实践、网络配置、容器/Docker、虚拟化/KVM、硬件讨论、软件推荐、发行版/包管理、Shell/脚本、系统服务、存储/备份、监控/日志、DevOps/CICD、云/边缘、数据库、中间件、Nginx/HTTP、内核/驱动、桌面/美化、问答/求助、经验分享、公告/活动

## 安全与隐私
- 对 `linux.do` 的所有请求由 content script 在同源环境发起，直接复用用户登录态。
- API Key 仅保存在本地，可选择“仅本会话记忆”。
- 默认不上传任何用户数据到第三方，除非用户自行配置的 AI 接口。
- 提供本地缓存清除与脱敏导出选项。

## 用户需提供/确认的信息
1. API Base URL（如 `https://api.openai.com/v1` 或私有网关）。
2. API Key。
3. Model 名称（如 `gpt-4o-mini`、`gpt-4-turbo`、`llama3` 等）。
4. AI 域名白名单（用于 Manifest `optional_host_permissions`）。
5. 是否默认启用“自动加载全部分页”（默认：是）。
6. （可选）抓取并发、AI 并发、超时、正文上限、快捷键、关键词簇启用情况、导入/导出偏好、排序默认值等。

## 验收要点
1. 匹配页面可见悬浮窗按钮与快捷键；面板可开关、拖拽、最小化。
2. 自动抓取所有收藏分页并在列表中渐进展示，标题搜索即时生效。
3. 标签筛选支持原生 + 预制 + 用户自定义标签，且采用 AND 逻辑。
4. AI 分类仅在候选标签内勾选，失败会重试或标记“待定”；人工编辑后不再被覆盖。
5. 数据与配置本地持久化，重新打开页面后结果一致；导入/导出功能可用。

## 未来扩展方向
- 对话式检索与总结面板（沿用现有分类数据与 AI 接口）。
- 作者多选筛选、排序方式自定义。
- 跨设备同步策略或手动同步工具。

