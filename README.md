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
- M3（工程化）：打包与发布、国际化、权限最小化与 CSP 强化、可观测性与日志
- M4（研究中）：离线嵌入向量与本地检索、跨设备同步（可选）


## 状态

本仓库当前为“设计与落地方案 PRD”，已补充更细化的工程落地与规范，便于拿到 API 与域名白名单后直接开工。


## 目录结构草案（MV3）

extension/
  manifest.json
  assets/
    icons/
      16.png 32.png 48.png 128.png
  src/
    content/
      content.ts
      panel/
        panel.html
        panel.css
        panel.ts
    background/
      sw.ts
    options/
      options.html
      options.css
      options.ts
    lib/
      idb.ts          （IndexedDB 封装）
      api.ts          （AI/HTTP 请求、重试与节流）
      classify.ts     （AI 分类调度与结果校验）
      dom.ts          （linux.do DOM/解析工具）
      msg.ts          （消息协议定义）
      types.ts        （类型与数据结构）
      logger.ts       （日志/埋点，可切换到 no-op）
  _locales/
    zh_CN/messages.json

说明：TS/构建工具可视情况增补；本 PRD 不强制构建链路，允许原生 ES 模块 + 轻量工具链。


## Manifest 示例（Edge/Chrome MV3）

{
  "manifest_version": 3,
  "name": "Linux.do 收藏增强",
  "version": "0.1.0",
  "description": "在 linux.do 收藏页提供 AI 标签筛选与本地持久化",
  "action": { "default_title": "Linux.do 收藏增强" },
  "permissions": ["storage", "scripting", "activeTab"],
  "host_permissions": ["https://linux.do/*"],
  "optional_host_permissions": ["https://api.openai.com/*"],
  "background": { "service_worker": "src/background/sw.js", "type": "module" },
  "content_scripts": [
    {
      "matches": ["https://linux.do/u/*/activity/bookmarks*"],
      "js": ["src/content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "src/options/options.html",
  "commands": {
    "toggle-panel": {
      "suggested_key": { "default": "Ctrl+K", "mac": "Command+K" },
      "description": "打开/关闭悬浮窗"
    }
  },
  "icons": {
    "16": "assets/icons/16.png",
    "32": "assets/icons/32.png",
    "48": "assets/icons/48.png",
    "128": "assets/icons/128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com"
  }
}

要点：
- AI 私有域按需添加到 optional_host_permissions 与 CSP connect-src；首次调用前通过 `chrome.permissions.request` 请求授权。
- 如果更倾向于“按需注入”，可改为在 Service Worker 中用 `chrome.scripting.executeScript` 注入 content.js（仍建议保留 matches 限定）。


## 消息协议（Content ↔ Service Worker）

消息信封
- { type: string, reqId: string, payload?: any }
- 响应沿用相同 reqId；关键异步流程可通过 progress 事件推送。

请求（content → sw）
- FETCH_BOOKMARK_PAGES { startPage?: number } → 分页抓取收藏，返回 {total, done}
- FETCH_TOPIC_DETAIL { url, topicId, postNumber } → 补充正文/作者/原生标签
- CLASSIFY_BATCH { postIds[] } → 触发 AI 分类并返回结果摘要
- SAVE_SETTINGS { partial } / GET_SETTINGS → 读写 Options
- EXPORT_JSON { scope: 'all'|'rules' } → 导出数据
- IMPORT_JSON { data, mode: 'merge'|'replace' }
- LIST_TAGS → 获取（预制 + 用户）标签字典
- UPSERT_TAG { name, enabled?, weight? } / DELETE_TAG { name }

事件（sw → content）
- PROGRESS { phase: 'fetch'|'classify'|'export'|'import', current, total }
- CLASSIFY_RESULT { postId, aiTags, modelSignature }
- ERROR { code, message, detail }
- DATA_UPDATED { scope: 'posts'|'tags'|'settings' }

错误码建议
- E_BAD_JSON（AI 返回非 JSON）
- E_TIMEOUT（超时）
- E_HTTP（网络/状态码）
- E_PARSE（DOM/JSON 解析失败）
- E_PERMISSION（可选域授权被拒）


## 数据抓取与解析（Discourse 兼容）

策略优先级
1) JSON 优先：多数 Discourse 端点支持 .json 后缀。
   - 书签页：`/u/<user>/activity/bookmarks.json?page=N`（若不可用则回退 DOM）
   - 主题/帖子：`/t/<slug>/<topicId>.json`，再在 post_stream 中按 post_number 定位书签的楼层，读取 cooked/raw。
2) DOM 回退：
   - 书签列表：CSS 选择器提取 标题、作者、链接、时间、原生标签。
   - 正文：访问帖子链接，提取对应楼层 HTML，去噪（引用/签名/脚注）并转为纯文本。

分页停止条件
- 页码递增直到返回空列表或重复游标；保存 pageCursor 以便断点续扫。

健壮性
- 针对登录态/私密/删除：记录状态码与占位，UI 灰显并可过滤隐藏。
- 针对接口/结构变化：两级回退（JSON→DOM），并上报 ERROR 事件。


## IndexedDB 设计细节

库名：linuxdo-bookmarks v1
- posts（keyPath: id，id= `${topicId}#${postNumber}`）
  - 索引：by_fav (favoriteAt)、by_upd (updatedAt)、by_author (author)、by_tag (multiEntry: aiTags+userTags+nativeTags)
- tags（keyPath: name）
  - 字段：{ name, type: 'preset'|'user', enabled: true, weight?: number }
- settings（keyPath: key）
  - 扁平键值：apiBase、apiKey、model、并发/超时等
- index_meta（keyPath: key）
  - pageCursor、scannedPostIds、failedQueue、schemaVersion

迁移：schemaVersion 由 SW 统一迁移；失败自动回滚并提示。


## 并发/速率控制与重试

- fetchConcurrency（默认 4）：抓取分页与详情并行，使用信号量队列；每个请求带 AbortController 与超时（默认 20s）。
- aiConcurrency（默认 2）：AI 分类批量切片，失败指数退避（2^n，含抖动），每日配额上限可设。
- 重试：网络/5xx/429 重试 ≤3 次；AI 非 JSON 重试 1 次；仍失败标记并入 failedQueue。
- 断点：抓取与分类均持久化进度；面板允许“暂停/继续”。


## AI 提示词模板与请求示例

System
- 你是严格的标签分类器。禁止创造新标签，只能从候选池中选择 0..N 个。
- 仅输出严格 JSON 数组，如 ["技术教程","Docker"]。

User（JSON 输入）
{
  "candidate_tags": ["技术教程","安全实践","Docker","网络配置"],
  "post_title": "...",
  "post_body": "...（按 bodyCharLimit 截断或摘要）",
  "notes": { "native_tags": ["A","B"], "language": "zh" }
}

请求（以 OpenAI Chat Completions 为例）
- POST {apiBase}/chat/completions
- headers: Authorization: Bearer {apiKey}
- body: { model, messages: [...], response_format: { type: "json_object" } | 工程策略：在返回后做 JSON-only 校验并剔除解释文本 }

响应处理
- 若是字符串首尾包裹代码围栏，先剥离；再 JSON.parse；失败即触发容错路径。


## Options 页面字段细化

基础
- apiBase、apiKey、model
- aiConcurrency、fetchConcurrency、timeoutMs、retryMax
- bodyCharLimit、enableKeywordClusters
- budgets：每批上限/每日配额

高级
- 自定义 headers（k/v 列表）
- 选择存储策略（仅 IndexedDB / 冗余存 chrome.storage.local）
- 导入/导出（全量/仅标签规则/脱敏导出）
- 热键自定义、排序默认值、作者筛选模式（AND/OR）


## 开发与调试（Edge）

- edge://extensions 打开开发者模式 → 加载已解压扩展（manifest 所在目录）。
- 在扩展卡片中点击“Service Worker 检查视图”查看日志与网络。
- content script 调试：在目标页面打开 DevTools，Sources 面板查看 src/content/*。
- 存储观察：Application → IndexedDB / Storage → chrome.storage.local。
- 可选：在 Options 页面提供“开发者模式”开关，显示更多诊断信息与导出日志按钮。


## 打包与发布

- 打包：构建（若使用 TS/打包器）→ 清理 source map（可选）→ 压缩为 zip。
- Edge 外发布：通过 Microsoft Partner Center 提交，更新说明强调“仅在 linux.do 域运行，零上报/可选 AI 出站”。
- 版本规范：SemVer；manifest version 与内部 schemaVersion 分别维护。


## 权限最小化与安全

- host_permissions 仅限 https://linux.do/*；AI 域名放入 optional_host_permissions。
- CSP 严格：禁止远程脚本；connect-src 仅列出必要 AI 域。
- API Key 仅本地；支持“仅本会话记忆”。
- 一键清除缓存；导出可脱敏（无正文）。


## 国际化与可访问性

- _locales 提供 zh-CN 起步，预留 en-US。
- ARIA 与键盘可达；高对比度与暗色主题支持。


## 风险与兼容性

- Discourse 页面结构变化：通过双通道解析与选择器容错规避。
- 大数据量：虚拟列表 + 分页加载；避免一次性渲染。
- AI 费用与配额：默认批量上限与每日预算保护。


## 参考实现建议

- IndexedDB：优先原生 IDB + 轻量封装；若引入库，推荐 idb/Dexie（二选一）。
- 虚拟列表：基于 IntersectionObserver + 占位高度实现轻量级虚拟滚动。
- 队列：实现一个 TokenBucket/Semaphore 工具，统一 fetch/AI 调用并发控制。


## 后续计划

- 在收到“API 三件套 + AI 域白名单 + 偏好默认值”后，提交第一版可运行骨架：manifest、SW 框架、Options 页面与注入式悬浮窗壳体；随后逐步接入抓取、存储与 AI 分类。


---

# 工程更新：已提交最小可运行骨架（2025-10）

本次新增了一个可在 Edge/Chrome 中直接加载的最小骨架，目录位于 `extension/`。

- manifest.json：MV3 基本配置，限定只在 `https://linux.do/u/*/activity/bookmarks*` 匹配页面注入；新增 `unlimitedStorage` 权限；为后续 AI 调用添加了 CSP `extension_pages` 的 `connect-src`（含 `https://api.openai.com`）。
- src/background/sw.js：Service Worker，处理快捷键 `toggle-panel` 并向活动页发送切换面板消息；预留设置读写接口；兼容更新为 `onStartup` 日志。
- src/content/content.js：内容脚本，注入右下角“收藏增强”按钮与 macOS 风格悬浮面板；支持 Ctrl/⌘+K 切换、Esc 关闭；面板内提供示例搜索框与示例列表数据（后续替换为真实抓取结果）。新增本地结果缓存（`chrome.storage.local`），优先渲染缓存并在后台刷新，提升打开速度。
- src/options/*：选项页，可填写并保存 API Base / API Key / Model，数据存储于 `chrome.storage.local`。保存时会尝试为 API Base 的域名申请可选主机权限（`chrome.permissions.request`），以便后续在 SW/Options 中发起跨域请求。

注意：为避免提交无效二进制图片，本次未包含 icons 资源；图标并非必需，后续可按需补充并在 manifest 中开启。

## 本地加载与验证

1) 打开 Edge `edge://extensions`（或 Chrome `chrome://extensions`），开启“开发者模式”。
2) 选择“加载已解压的扩展”，指向本仓库的 `extension/` 目录。
3) 登录 linux.do 后访问 `https://linux.do/u/<你的ID>/activity/bookmarks`。
4) 右下角将出现“收藏增强”按钮，点击或使用 Ctrl/⌘+K 打开面板；Esc 关闭。
5) 选项页：在扩展卡片内点击“详情 → 扩展选项”进入，验证设置保存与读取。

若快捷键无效，请确认扩展的“键盘快捷键”设置中 `toggle-panel` 未被其它快捷键占用。

## 下一步（从骨架到 MVP）

- 抓取
  - 书签分页：优先 `.../activity/bookmarks.json?page=N`，回退 DOM 解析。
  - 帖子正文：优先 `.../t/<slug>/<topicId>.json` 中按 post_number 定位；回退到 HTML → 纯文本。
  - 断点续扫：保存 pageCursor 与 scannedPostIds。
- 数据层
  - IndexedDB 初始化：posts / tags / settings / index_meta 四库；读写封装与版本迁移。
  - 列表虚拟化：IntersectionObserver 占位方案，避免长列表卡顿。
- AI 分类
  - Options 配置生效；构建消息体与 Prompt 模板；JSON-only 校验与一次性重试。
  - 批量切片 + 并发/配额控制；失败入队重试。
- UI & 交互
  - 标签面板与 AND 筛选；行内编辑标签并置 `locked=true`。
  - 导入/导出（JSON），含“仅规则/脱敏导出”。
- 安全与权限
  - 可选域授权流程：首次调用前检测 `optional_host_permissions` 并请求授权。
  - CSP connect-src 动态拼接允许域，或在 manifest 中按需列出。

## 关键接口草图（示例伪码）

- 抓取分页
  - GET /u/<user>/activity/bookmarks.json?page=N → { bookmarks: [...], has_next: bool }
  - 每条 item 派发到明细抓取/解析队列。
- 帖子详情
  - GET /t/<slug>/<topicId>.json → post_stream.posts[] 中按 post_number 定位 → 提取 cooked/raw → 纯文本。
- 分类请求
  - POST {apiBase}/chat/completions (Authorization: Bearer {apiKey})
  - messages: [system约束, user(JSON输入)]；响应做 JSON-only 解析。

## 备注

- 当前骨架未访问任何外部网络，仅在 linux.do 页面插入 UI 与本地存储设置。
- 真实抓取、IndexedDB、AI 分类将在后续迭代逐步接入，不影响现有加载与调试流程。


---

# 工程更新：模块化架构与 AI 分类完整实现（2025-10）

## 本次更新概要

基于前序骨架版本，本次更新实现了完整的模块化架构、IndexedDB 数据层、AI 分类引擎，以及增强的设置界面。主要改进包括：

### 1. 模块化库结构（`src/lib/`）

新增专用工具库，提供清晰的模块化架构：

#### `lib/types.js`
- 定义消息协议常量（`MSG`）：content script ↔ service worker 通信规范
- 错误码枚举（`ERR`）：统一错误处理
- 标签类型（`TAG_TYPE`）：preset（预制）、user（用户自定义）、native（原生）
- 预制标签库（`PRESET_TAGS`）：25 个 Linux/技术相关标签
- 默认设置（`DEFAULT_SETTINGS`）：所有可配置项的默认值
- TypeScript 风格的 JSDoc 类型定义（Post、Classify、Tag、Settings）

#### `lib/idb.js`
- IndexedDB 完整封装，支持四个核心 store：
  - **posts**：收藏帖子数据，含多个索引（by_fav, by_upd, by_author, by_tag）
  - **classifies**：AI 分类结果与用户标签，支持锁定状态
  - **tags**：标签字典（预制 + 用户自定义）
  - **settings**：扩展设置（键值对）
  - **index_meta**：抓取游标、已扫描列表、失败队列等元数据
- 通用 CRUD 操作：`getOne`, `putOne`, `deleteOne`, `getAll`, `putMany`, `clearStore`, `clearAll`
- 索引查询支持：`getAllByIndex`
- 自动版本迁移与错误处理

#### `lib/api.js`
- **带重试的 fetch 封装**（`fetchWithRetry`）：
  - 超时控制（AbortController）
  - 指数退避重试（针对 429/5xx/网络错误）
  - 可配置重试次数与超时时间
- **AI 分类核心接口**（`callAIClassify`）：
  - 构建标准 OpenAI Chat Completions 请求
  - 严格 Prompt 工程：仅从候选池选择标签，输出严格 JSON 数组
  - 智能响应解析：剥离代码围栏、支持多种格式、过滤非法标签
  - 文本截断与语言检测
- **并发控制类**（`Semaphore`）：
  - 信号量实现，控制 AI 与抓取并发数
  - `acquire` / `release` / `run` 方法

#### `lib/classify.js`
- **批量分类调度**（`classifyBatch`）：
  - 自动过滤已锁定帖子
  - 批次大小限制与每日配额保护
  - 并发控制与进度回调
  - 失败容错与结果记录
- **候选标签获取**（`getCandidateTags`）：
  - 根据设置动态启用/禁用预制标签
  - 合并用户自定义标签
- **手动标签编辑**（`updatePostTags`）：
  - 人工修改后自动锁定（`locked=true`）
  - AI 不再覆盖已锁定帖子
- **标签合并查询**（`getPostAllTags`）：
  - 三层标签合并：native + AI + user

#### `lib/logger.js`
- 统一日志工具，支持 debug/info/warn/error 级别
- 可通过开关全局启用/禁用

### 2. Service Worker 重构（`src/background/sw.js`）

完全重写 service worker，实现完整数据协调层：

- **消息驱动架构**：统一 `handleMessage` 入口，支持所有消息类型
- **IndexedDB 初始化**：首次安装时自动创建 stores 并注入预制标签
- **设置管理**：GET_SETTINGS / SAVE_SETTINGS，合并默认值
- **标签管理**：LIST_TAGS / UPSERT_TAG / DELETE_TAG
- **分类调度**：CLASSIFY_BATCH 触发批量 AI 分类并返回结果
- **标签编辑**：UPDATE_POST_TAGS 手动编辑并锁定
- **导入导出**：EXPORT_JSON / IMPORT_JSON，支持 all/posts/tags/settings 范围
- **数据清理**：CLEAR_ALL_DATA 一键清空所有本地数据
- **进度通知**：向 content script 发送 PROGRESS 和 DATA_UPDATED 消息

### 3. 增强的 Options 页面（`src/options/`）

#### 新增高级设置：
- **基础配置**：API Base / API Key / Model（保持不变）
- **高级设置**（网格布局）：
  - AI 并发数（1-10，默认 2）
  - 抓取并发数（1-10，默认 4）
  - 超时时间（5000-60000 ms，默认 20000）
  - 最大重试次数（0-5，默认 3）
  - 正文字符上限（1000-32000，默认 8000）
  - 每批分类上限（10-500，默认 100）
- **预制标签开关**：启用/禁用 25 个预制技术标签
- **三个操作按钮**：
  - **保存**：写入所有设置并请求 API 域权限
  - **恢复默认**：重置为 DEFAULT_SETTINGS
  - **清除所有数据**（危险操作，红色）：清空 IndexedDB 与缓存

#### UI 改进：
- 响应式网格布局（`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`）
- Checkbox 布局优化（横向排列）
- 危险按钮视觉警示（红色背景）

### 4. Manifest 更新

- 新增 `icons` 配置：使用 SVG 图标（`assets/icons/icon.svg`）
- 所有尺寸（16/32/48/128）指向同一 SVG，支持自适应缩放

### 5. 数据流架构

完整的数据流示意：

```
用户操作（Content Script）
    ↓
chrome.runtime.sendMessage({ type: MSG.XXX, payload })
    ↓
Service Worker → handleMessage()
    ↓
调用 lib/* 工具：
  - idb.js（数据持久化）
  - api.js（AI 请求与重试）
  - classify.js（分类调度）
    ↓
返回结果或发送进度事件
    ↓
Content Script 更新 UI
```

### 6. 关键特性实现

✅ **三层标签体系**：
- **Native**：Discourse 原生标签，自动提取
- **Preset**：25 个技术相关预制标签，可禁用
- **User**：用户自定义标签，增删改

✅ **AI 分类引擎**：
- 严格 Prompt 工程：禁止创造新标签，仅从候选池勾选
- JSON-only 响应解析，自动剥离代码围栏
- 失败重试与容错（BAD_JSON / TIMEOUT / HTTP 错误码）
- 人工编辑后自动锁定，AI 不再覆盖

✅ **并发与速率控制**：
- Semaphore 信号量实现
- 可配置 AI 并发数（默认 2）与抓取并发数（默认 4）
- 指数退避重试（2^n + 抖动，最大 10s）

✅ **数据持久化**：
- IndexedDB 为主存储，支持多索引查询
- chrome.storage.local 为辅（设置与轻量缓存）
- 支持全量/分类导出与合并/替换导入

✅ **渐进增强**：
- 骨架版已有的抓取与 UI 逻辑保持不变
- 新增模块可独立测试与调试
- 向后兼容，无破坏性更改

### 7. 未来待实现功能

⏳ **Content Script 集成**：
- 将 content.js 迁移到使用新消息协议（MSG.*）
- 调用 SW 的 CLASSIFY_BATCH / UPDATE_POST_TAGS
- 显示 AI 分类进度与结果

⏳ **虚拟列表**：
- 实现 IntersectionObserver 占位方案
- 支持 1000+ 帖子流畅滚动

⏳ **关键词簇**（可选）：
- AI 提取主题词作为只读辅助筛选

⏳ **多作者筛选**：
- AND/OR 模式切换

⏳ **排序增强**：
- 最新收藏 / 最新更新 / 作者 A→Z / 命中标签数

### 8. 技术亮点

- **ES6 模块化**：所有 lib/* 使用 `export` / `import`，manifest 中 `type: "module"`
- **Promise 风格**：统一异步模式，避免回调地狱
- **类型安全**：JSDoc 提供 IDE 智能提示与类型检查
- **错误边界**：所有异步操作 try-catch，统一 ERR 错误码
- **可测试性**：每个模块单一职责，易于单元测试

## 验证步骤

1. 打开 Edge `edge://extensions`（或 Chrome），启用"开发者模式"
2. 加载已解压扩展，指向 `extension/` 目录
3. 进入扩展选项页，填写 API 配置并保存
4. 访问 `https://linux.do/u/<你的ID>/activity/bookmarks`
5. 点击"收藏增强"按钮或按 `Ctrl/⌘+K` 打开面板
6. 查看 Service Worker 日志：应显示 IndexedDB 初始化成功与预制标签注入
7. 在 DevTools → Application → IndexedDB 中验证 `linuxdo-bookmarks` 数据库与 stores
8. （需配置有效 API）触发 AI 分类并观察结果

## 依赖与兼容性

- **浏览器**：Edge/Chrome 93+（MV3 支持）
- **无外部依赖**：纯原生 Web API（IndexedDB、Fetch、chrome.* API）
- **文件大小**：约 30KB（未压缩）

## 后续路线图

- [ ] 完整集成 content script 与新消息协议
- [ ] 实现虚拟列表性能优化
- [ ] 添加单元测试（lib/* 模块）
- [ ] 国际化支持（`_locales/en_US`）
- [ ] 发布到 Edge Add-ons 商店
