# Quick Start Guide - Linux.do 收藏增强

## 5 分钟快速上手

### 1. 加载扩展（1 分钟）

```bash
# 1. 打开浏览器扩展页
Edge: edge://extensions
Chrome: chrome://extensions

# 2. 启用"开发者模式"（右上角开关）

# 3. 点击"加载已解压的扩展"，选择本仓库的 extension/ 目录
```

### 2. 配置 API（2 分钟）

```bash
# 1. 在扩展管理页点击"详情 → 扩展选项"

# 2. 填写以下配置：
API Base URL: https://api.openai.com/v1
API Key: sk-your-api-key-here
Model: gpt-4o-mini

# 3. 点击"保存"并允许权限请求
```

### 3. 使用扩展（2 分钟）

```bash
# 1. 访问你的 linux.do 收藏页
https://linux.do/u/<你的用户名>/activity/bookmarks

# 2. 点击右下角"收藏增强"按钮或按 Ctrl+K (Mac: Cmd+K)

# 3. 等待收藏加载（首次需 5-30 秒）

# 4. 享受功能：
- 搜索框输入关键词实时过滤
- 点击标签进行 AND 筛选
- 点击"导出"下载备份
- 点击"刷新"获取最新收藏
```

---

## 主要功能一览

### ✅ 已实现

| 功能 | 描述 | 快捷键 |
|------|------|--------|
| **悬浮面板** | macOS 风格面板，可拖拽移动 | `Ctrl/⌘+K` 打开/关闭 |
| **自动抓取** | 自动并发抓取所有收藏分页 | 打开面板时自动触发 |
| **搜索过滤** | 标题关键词即时搜索 | `/` 聚焦搜索框 |
| **标签筛选** | 多选标签 AND 逻辑筛选 | 点击标签勾选 |
| **本地缓存** | 5 分钟缓存，秒开面板 | 自动缓存 |
| **导出/导入** | JSON 格式备份与恢复 | 面板工具栏 |
| **模块化架构** | lib/* 工具库，易扩展 | - |
| **IndexedDB** | 持久化存储，支持大数据 | 自动初始化 |
| **AI 分类引擎** | OpenAI 兼容接口，智能标签 | 需配置 API |
| **预制标签** | 25 个技术标签，可禁用 | 选项页开关 |

### ⏳ 计划中

- [ ] 虚拟列表（支持 1000+ 帖子流畅滚动）
- [ ] Content Script 完整集成新消息协议
- [ ] 多作者筛选（AND/OR 模式）
- [ ] 排序功能（时间/作者/标签数）
- [ ] 关键词簇（AI 提取主题词）
- [ ] 国际化（i18n）

---

## 文件结构速览

```
extension/
├── manifest.json              # MV3 配置
├── assets/icons/              # 图标资源
└── src/
    ├── background/sw.js       # Service Worker（后台协调）
    ├── content/content.js     # Content Script（UI + 抓取）
    ├── options/               # 设置页面
    │   ├── options.html
    │   ├── options.css
    │   └── options.js
    └── lib/                   # 工具库（核心逻辑）
        ├── types.js           # 类型定义、常量、预制标签
        ├── idb.js             # IndexedDB 封装
        ├── api.js             # HTTP 请求、AI 调用、并发控制
        ├── classify.js        # 分类调度、标签管理
        └── logger.js          # 日志工具

DEVELOPMENT.md                 # 开发指南（架构、API、调试）
TESTING.md                     # 测试指南（功能清单、验证步骤）
CONTRIBUTING.md                # 贡献指南（代码规范、PR 流程）
CHANGELOG.md                   # 版本历史
```

---

## 常用命令

```bash
# 语法检查
npm run check:syntax

# Manifest 验证
npm run check:manifest

# 打包发布
npm run pack
# 生成 linuxdo-bookmark-enhancement.zip

# 清理
npm run clean
```

---

## 故障排除

### 问题：面板打不开
**解决**：
1. 确认在 `https://linux.do/u/*/activity/bookmarks` 页面
2. 检查 Service Worker 是否运行（扩展管理页查看）
3. 刷新页面重试

### 问题：收藏列表为空
**解决**：
1. 确认已登录 linux.do
2. 检查网络请求（DevTools → Network）
3. 查看 Service Worker 控制台错误日志

### 问题：AI 分类失败
**解决**：
1. 检查 API Key 是否有效（在选项页重新保存）
2. 确认 API Base URL 格式正确（末尾不带 `/`）
3. 查看 Service Worker 日志中的具体错误码

### 问题：快捷键冲突
**解决**：
1. 访问 `edge://extensions/shortcuts`
2. 重新设置 `toggle-panel` 快捷键

---

## 更多资源

- **详细文档**: README.md（完整 PRD 和架构说明）
- **开发指南**: DEVELOPMENT.md（模块 API、消息协议、调试技巧）
- **测试指南**: TESTING.md（功能测试清单、性能测试）
- **贡献指南**: CONTRIBUTING.md（代码规范、提交流程）

---

## 反馈与支持

- **GitHub Issues**: [报告 bug 或功能建议]
- **Email**: [维护者邮箱]
- **Discussions**: [社区讨论]

---

## 许可证

MIT License - 自由使用、修改、分发

---

**祝使用愉快！🎉**

如有问题欢迎提 Issue 或 PR。
