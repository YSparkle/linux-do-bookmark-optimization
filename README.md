# Linux.do 收藏增强 Edge 扩展

## 一句话目标

在 `https://linux.do/u/*/activity/bookmarks` 页面插入一个可开关的悬浮窗：自动抓取并汇总当前登录用户的全部“收藏”，以“原生标签 + 预制标签 + 用户自定义标签”三层体系配合 AI 做多标签（AND）筛选与标题搜索，并把结果本地持久化（IndexedDB 为主）。


## 运行范围与权限

- 页面匹配：`https://linux.do/u/*/activity/bookmarks*`（含分页 `?page=`）
- 请求权限：所有与 linux.do 相关的抓取均由 content script 在同源环境发起，天然携带用户 Cookie 使用其权限
- Manifest host_permissions：`https://linux.do/*`
- AI 接口域名：放入 `optional_host_permissions`（首次配置时提示授权）


## 架构总览（MV3）

- Content Script（页面脚本）
  - 在匹配页面注入悬浮窗（Shadow DOM 隔离样式）
  - 在同源、带 Cookie 的上下文抓取收藏分页、帖子详情与原生标签
  - 与 Service Worker 通信：存取、分类调度、导入/导出
- Service Worker（后台）
  - 负责数据持久化（IndexedDB + chrome.storage.local，启用 unlimitedStorage）
  - 统一 AI 调用、并发/速率控制、失败重试与断点续扫
  - 维护索引、搜索缓存、数据版本迁移
- Options 页面（设置）
  - 输入/修改：API Base、API Key、Model、并发/超时、正文上限、关键词簇开关等
- Commands（快捷键）
  - `Ctrl/⌘ + K` 打开/关闭面板；`Esc` 最小化；`/` 聚焦搜索框

Manifest 要点
- host_permissions：`https://linux.do/*`；AI 域名在 `optional_host_permissions`
- permissions：`storage`, `scripting`, `activeTab`，可选 `cookies`, `downloads`
- CSP：允许对已授权 AI 域名的 `connect-src`
- declarativeContent：仅在匹配页面启用注入逻辑


## 功能清单（按优先级）

1) 悬浮窗 UI（macOS 风格）
- 居中弹出，可拖拽，可最小化（右上角 ×），支持开/关按钮与快捷键（默认 `Ctrl/⌘ + K`）
- 简洁长列表：每行显示 标题（可跳转）、作者、时间、原生标签、AI 标签、用户自定义标签
- 顶部搜索框：按标题关键词即时过滤（大小写不敏感）
- 多选标签筛选（AND 逻辑）：勾选后只显示同时命中所有已选标签的帖子
- 行内“编辑标签”按钮：人工增删标签并保存

2) 数据获取（默认：自动加载全部分页）
- 打开悬浮窗后自动并发抓取所有收藏分页（默认并发 4）
- 每条收藏抓取：标题、作者、链接、时间、原生标签、正文（尽量全文，JSON 接口优先，失败再回退 HTML 解析）
- 渐进渲染：先展现基本信息，正文与标签异步补全

3) 三层“智能标签”体系
- 来源1：原生标签（必保留，自动提取）
- 来源2：预制标签（可禁用、不可改名；冷启动用）
- 来源3：用户自定义标签（增删改、合并、启停；显示权重可选）

4) AI 多标签分类（决策者，不创造新标签）
- 候选池 = 预制标签 + 用户自定义标签（可选加入“关键词簇”只读筛选组）
- Prompt 限定只允许从候选池选择 0..N 个标签，输出严格 JSON 数组
- 触发：全量抓取后对未分类帖子批量分片调用；后续增量（发现新收藏或正文哈希变化）
- 容错：非 JSON 自动重试一次；再次失败标记“AI 待定”
- 人工覆盖：手动编辑即 `locked=true`，AI 不再改写

5) 持久化与同步
- IndexedDB：存放 Post/Tag/Classify/索引 等大数据量实体
- chrome.storage.local：保存配置与轻量状态；启用 unlimitedStorage
- 导入/导出：JSON 文件（支持仅标签规则或全量数据）
- 版本迁移：由 Service Worker 进行 schema 迁移与兼容

6) 人工校正
- 行内“编辑标签”支持增删任意标签，并置 `locked=true`

7) 性能与健壮性
- 抓取并发、AI 并发可配置；失败重试与指数退避；请求超时可配置
- 断点续扫：保存分页游标、已抓取与已分类状态
- 大集合优化：虚拟列表、正文按需加载、渐进渲染

8) 可选（增强）
- 作者维度筛选（多选 AND/OR 可切换，默认 AND）
- 排序：最新收藏 / 最新更新 / 作者 A→Z / 命中标签数
- 关键词簇：AI 提取主题词，作为只读辅助筛选组（不与标签混用）


## 配置面板（必须项）

- API Base URL（如 `https://api.openai.com/v1` 或你的代理）
- API Key（仅本地保存）
- Model 名称（如 `gpt-4o-mini`、`gpt-4-turbo`、`llama3` 等）
- 可选高级项：
  - 额外请求头（适配代理/兼容接口）
  - 最大并发、超时时间、失败重试次数
  - 单帖正文上限（超限自动截断或摘要后再分类）
  - 费用保护（每批最多 N 篇 / 每日配额）
  - 启用关键词簇、快捷键、存储策略等


## 预制标签（默认集，可禁用）

技术教程、环境搭建、故障排查、性能优化、安全实践、网络配置、容器/Docker、虚拟化/KVM、硬件讨论、软件推荐、发行版/包管理、Shell/脚本、系统服务、存储/备份、监控/日志、DevOps/CICD、云/边缘、数据库、中间件、Nginx/HTTP、内核/驱动、桌面/美化、问答/求助、经验分享、公告/活动


## AI 调用约束（核心）

输入（示例）
{
  "candidate_tags": ["技术教程","安全实践","Docker","网络配置"],
  "post_title": "标题",
  "post_body": "正文（可能截断）",
  "notes": {"native_tags": ["discourse 原生标签A","B"], "language": "zh/en"}
}

System 约束
- 你是分类器，只能从 candidate_tags 勾选 0..N 个，禁止创造新标签
- 仅输出严格 JSON 数组，例如 ["技术教程","Docker"]，不得包含解释文本

容错与速率
- 若返回非 JSON：自动重试一次；仍失败则标记“AI 待定”并允许人工补充
- AI 并发默认 2，可在 Options 调整；支持批量分片与每日配额

兼容接口
- 兼容 OpenAI Chat Completions/Responses 结构（官方、代理或自建均可）
- 支持自定义请求头以适配非官方兼容接口


## 数据模型（扩展版）

- Post：id(topicId#postId), title, author, url, createdAt, updatedAt, favoriteAt, nativeTags[], body(text/片段数组), hash
- Classify：postId, aiTags[], userTags[], locked, modelSignature(apiBase+model+规则版本), ts
- TagDict：preset[], user[]（含 name, enabled, 可选 weight）
- Settings：apiBase, apiKey, model, aiConcurrency, fetchConcurrency, timeout, bodyCharLimit, enableKeywordClusters, hotkey, storagePolicy
- Index：pageCursor, scannedPostIds[], failedQueue[], version


## 交互流（默认）

1. 进入 `.../activity/bookmarks` → 悬浮窗按钮出现 → 点击打开
2. 首次进入设置：填 API Base/Key/Model 并保存
3. 自动开始抓取所有分页收藏项 → 渐进展示
4. 对未分类帖子触发 AI 分类（批量节流）→ 得到 aiTags 并保存
5. 用户多选标签 + 搜索标题 → 列表即时过滤（AND 逻辑）
6. 行内“编辑标签” → 保存后该贴 locked=true，AI 不再覆盖
7. 需要时导出/导入（JSON）


## 边界与异常

- 已删除/私密帖子：记录不可访问状态并从列表剔除（可灰条提示）
- 接口节流/失败：指数退避 + 可视提示；允许暂停/继续
- DOM/接口变更：JSON 失败回退 HTML 解析；仍失败提示“适配待更新”
- 大集合：虚拟列表 + 按需加载；AI 批次流控


## 安全与隐私

- 对 linux.do 的抓取由 content script 发起，天然复用用户会话 Cookie
- API Key 仅本地保存；支持“仅本会话记忆”（关闭浏览器即清除）
- 零上报：除非用户配置的 AI 接口，默认不出站上传用户数据
- 一键清除本地缓存；支持“脱敏导出”（去正文，仅元数据+标签）


## 键鼠与无障碍

- 快捷键：`Ctrl/⌘ + K` 打开/关闭；`Esc` 最小化；`/` 聚焦搜索框
- ARIA：面板/按钮/列表项具备语义；高对比度主题；键盘可达


## 验收标准（要点）

1. 在 `.../activity/bookmarks` 页面看到悬浮窗按钮；`Ctrl/⌘ + K` 可开关与最小化
2. 自动加载全部分页并合并展示；搜索框即时过滤标题
3. 三层标签来源清晰；多选标签按 AND 逻辑过滤列表
4. 首次/增量 AI 分类正常；手动“编辑标签”后该贴不再被 AI 覆盖
5. 重开页面后数据与分类结果保持一致；支持 JSON 导入/导出


## 你需要提供/确认的内容（Edge 扩展版）

必填
1) API Base URL（如 `https://api.openai.com/v1` 或你的网关）
2) API Key
3) Model 名称（如 `gpt-4o-mini` / `gpt-4-turbo` / `llama3`…）

扩展特有
4) AI 域名白名单：用于 Manifest `optional_host_permissions`（例如 `https://api.openai.com/*` 或你的私有域）
5) 是否保持默认：自动加载全部分页（默认开启）

可选默认值（如不提供将按以下执行）
- 抓取并发 4、AI 并发 2、超时 20s
- 正文上限 8000 字；开启“关键词簇（只读）”
- 存储策略：IndexedDB + unlimitedStorage；导入/导出开启
- 快捷键 `Ctrl/⌘ + K`；排序默认“收藏时间倒序”


## 里程碑建议

- MVP（当前目标）：悬浮窗 + 全量抓取 + 三层标签 + AI 分类 + 搜索与多选 AND 筛选 + 持久化 + 导入/导出
- M2（可选）：对话面板（检索/汇总/比较），作者维度筛选，排序增强，多窗口并行任务


## 状态

本仓库当前仅包含 PRD，尚未进入开发阶段；收到“API 三件套 + 域名白名单 + 偏好项”后，将据此产出第一版实现草稿（MV3 目录结构、manifest、options 与消息协议等）。
