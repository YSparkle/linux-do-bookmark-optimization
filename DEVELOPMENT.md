# Linux.do 收藏增强 - 开发指南

## 快速开始

### 前置要求
- Microsoft Edge 93+ 或 Chrome 93+（支持 Manifest V3）
- 基础的 JavaScript/ES6 模块知识
- （可选）有效的 OpenAI API Key 或兼容接口

### 本地开发

1. **克隆仓库并进入扩展目录**
   ```bash
   cd extension/
   ```

2. **加载扩展**
   - 打开 `edge://extensions` 或 `chrome://extensions`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展"
   - 选择 `extension/` 目录

3. **配置 API**
   - 在扩展管理页面点击"详情 → 扩展选项"
   - 填写 API Base URL、API Key、Model 名称
   - 保存后会自动请求可选主机权限

4. **测试**
   - 访问 `https://linux.do/u/<你的ID>/activity/bookmarks`
   - 应该看到右下角"收藏增强"按钮
   - 按 `Ctrl/⌘+K` 或点击按钮打开面板

## 架构概览

### 目录结构
```
extension/
├── manifest.json              # MV3 配置文件
├── assets/
│   └── icons/
│       └── icon.svg          # 扩展图标
└── src/
    ├── background/
    │   └── sw.js             # Service Worker（数据协调层）
    ├── content/
    │   └── content.js        # Content Script（UI + 抓取）
    ├── options/
    │   ├── options.html      # 设置页面
    │   ├── options.css       # 设置页样式
    │   └── options.js        # 设置页逻辑
    └── lib/
        ├── types.js          # 类型定义与常量
        ├── idb.js            # IndexedDB 封装
        ├── api.js            # HTTP 请求与重试
        ├── classify.js       # AI 分类调度
        └── logger.js         # 日志工具
```

### 数据流

```
┌──────────────────┐
│  Content Script  │ ← 用户交互、DOM 解析
└────────┬─────────┘
         │ chrome.runtime.sendMessage()
         ↓
┌──────────────────┐
│ Service Worker   │ ← 消息路由、数据协调
└────────┬─────────┘
         │ import lib/*
         ↓
┌──────────────────────────────────────┐
│  lib/                                │
│  • idb.js    → IndexedDB 持久化      │
│  • api.js    → AI 请求与重试         │
│  • classify.js → 分类调度            │
└──────────────────────────────────────┘
```

## 核心模块详解

### 1. lib/types.js

**用途**：定义消息协议、错误码、标签类型、预制标签库、默认设置

**关键导出**：
- `MSG`：消息类型常量（TOGGLE_PANEL, CLASSIFY_BATCH 等）
- `ERR`：错误码（BAD_JSON, TIMEOUT, HTTP 等）
- `TAG_TYPE`：preset / user / native
- `PRESET_TAGS`：25 个预制标签数组
- `DEFAULT_SETTINGS`：默认配置对象

**使用示例**：
```javascript
import { MSG, PRESET_TAGS } from '../lib/types.js';

chrome.runtime.sendMessage({ type: MSG.LIST_TAGS });
console.log('预制标签:', PRESET_TAGS);
```

### 2. lib/idb.js

**用途**：IndexedDB 抽象层，提供 CRUD 操作

**数据库设计**：
- **posts**：收藏帖子
  - keyPath: `id` (topicId#postNumber)
  - 索引：by_fav, by_upd, by_author, by_tag
- **classifies**：分类结果
  - keyPath: `postId`
  - 索引：by_locked, by_ts
- **tags**：标签字典
  - keyPath: `name`
  - 索引：by_type, by_enabled
- **settings**：键值对设置
- **index_meta**：元数据（游标、已扫描列表等）

**常用 API**：
```javascript
import { openDB, getOne, putOne, getAll, putMany } from '../lib/idb.js';

// 初始化数据库
await openDB();

// 读取单条
const post = await getOne('posts', 'topicId#postNumber');

// 写入单条
await putOne('tags', { name: '自定义标签', type: 'user', enabled: true });

// 批量写入
await putMany('posts', [post1, post2, post3]);

// 读取全部
const allTags = await getAll('tags');

// 通过索引查询
const lockedClassifies = await getAllByIndex('classifies', 'by_locked', true);

// 清空 store
await clearStore('posts');
```

### 3. lib/api.js

**用途**：HTTP 请求封装、AI 调用、并发控制

**核心功能**：

#### fetchWithRetry
带超时和指数退避的 fetch 封装：
```javascript
import { fetchWithRetry } from '../lib/api.js';

const response = await fetchWithRetry(
  'https://api.example.com/data',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'value' }),
  },
  20000,  // 超时 20 秒
  3       // 最多重试 3 次
);
```

#### callAIClassify
AI 分类核心接口：
```javascript
import { callAIClassify } from '../lib/api.js';

const settings = {
  apiBase: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  bodyCharLimit: 8000,
};

const candidateTags = ['技术教程', 'Docker', '安全实践'];
const post = {
  id: '12345#1',
  title: 'Docker 安全最佳实践',
  body: '本文介绍...',
  nativeTags: ['docker'],
};

const aiTags = await callAIClassify(settings, candidateTags, post);
// 返回: ['技术教程', 'Docker', '安全实践']
```

#### Semaphore
并发控制：
```javascript
import { Semaphore } from '../lib/api.js';

const sem = new Semaphore(2); // 最多并发 2 个任务

const tasks = urls.map(url => () => sem.run(async () => {
  const response = await fetch(url);
  return response.json();
}));

const results = await Promise.all(tasks.map(t => t()));
```

### 4. lib/classify.js

**用途**：批量分类调度、标签管理

**核心功能**：

#### classifyBatch
批量 AI 分类：
```javascript
import { classifyBatch } from '../lib/classify.js';

const posts = [/* Post 对象数组 */];
const settings = await getSettings();

const results = await classifyBatch(posts, settings, (progress) => {
  console.log(`进度: ${progress.current}/${progress.total}`);
});

// results: [{ postId, tags, success }, ...]
```

#### updatePostTags
手动编辑标签（自动锁定）：
```javascript
import { updatePostTags } from '../lib/classify.js';

await updatePostTags('12345#1', ['技术教程', '自定义标签']);
// 该帖子的 classify.locked 将被设为 true
```

#### getPostAllTags
获取三层标签合并结果：
```javascript
import { getPostAllTags } from '../lib/classify.js';

const tags = await getPostAllTags(post);
// 返回: {
//   nativeTags: ['原生标签'],
//   aiTags: ['技术教程', 'Docker'],
//   userTags: ['自定义标签'],
//   locked: true
// }
```

## 消息协议

### Content Script → Service Worker

所有消息格式：
```javascript
{
  type: string,      // MSG.* 常量
  payload?: any,     // 可选负载
  reqId?: string     // 可选请求 ID（用于跟踪）
}
```

**示例**：
```javascript
// 获取设置
const response = await chrome.runtime.sendMessage({
  type: MSG.GET_SETTINGS
});
// response: { ok: true, data: { apiBase, apiKey, ... } }

// 批量分类
const response = await chrome.runtime.sendMessage({
  type: MSG.CLASSIFY_BATCH,
  payload: { posts: [post1, post2] }
});
// response: { ok: true, data: [result1, result2] }

// 更新标签
const response = await chrome.runtime.sendMessage({
  type: MSG.UPDATE_POST_TAGS,
  payload: { postId: '12345#1', userTags: ['标签1', '标签2'] }
});
```

### Service Worker → Content Script

**进度通知**：
```javascript
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === MSG.PROGRESS) {
    console.log(`${msg.payload.phase}: ${msg.payload.current}/${msg.payload.total}`);
  }
});
```

**数据更新通知**：
```javascript
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === MSG.DATA_UPDATED) {
    // 重新加载数据
    refreshUI();
  }
});
```

## 调试技巧

### Service Worker 调试

1. 打开 `edge://extensions`
2. 找到扩展卡片，点击"Service Worker 检查视图"
3. 在控制台中：
   ```javascript
   // 查看日志前缀
   [ldbe] service worker installed
   [ldbe] IndexedDB initialized
   [ldbe] Initialized 25 preset tags
   ```

### IndexedDB 查看

1. 在 Service Worker DevTools 中打开 Application 选项卡
2. 展开 IndexedDB → linuxdo-bookmarks
3. 查看各个 store 的数据

### Content Script 调试

1. 在 linux.do 收藏页打开 DevTools
2. Sources 面板搜索 `content.js`
3. 设置断点或使用 `console.log`

### 网络请求监控

1. 在 Service Worker DevTools 的 Network 选项卡
2. 筛选 `/chat/completions` 查看 AI 请求
3. 检查请求体、响应体、耗时

## 常见问题

### Q: 扩展加载失败，提示"Manifest 错误"
**A**: 检查 manifest.json 格式，确保所有路径正确，且 service_worker 文件存在。

### Q: Service Worker 频繁重启
**A**: MV3 的 SW 是短生命周期的，正常现象。持久化数据使用 IndexedDB 而非全局变量。

### Q: AI 分类一直失败
**A**: 
1. 检查 API Key 是否有效
2. 查看 Service Worker 控制台的错误日志
3. 确认 API Base URL 格式正确（如 `https://api.openai.com/v1`）
4. 检查是否已授予可选主机权限（在选项页保存后会自动请求）

### Q: 快捷键不生效
**A**: 
1. 打开 `edge://extensions/shortcuts`
2. 检查 `toggle-panel` 是否被其他扩展占用
3. 重新设置快捷键

### Q: IndexedDB 数据丢失
**A**: 
1. 确保已启用 `unlimitedStorage` 权限（manifest 中已配置）
2. 浏览器隐私模式下 IndexedDB 可能受限
3. 定期使用导出功能备份数据

## 性能优化建议

### 1. 虚拟列表
对于 1000+ 帖子，建议实现虚拟滚动：
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // 懒加载帖子详情
    }
  });
});
```

### 2. 缓存策略
- 短期缓存（5 分钟）：chrome.storage.local
- 长期缓存：IndexedDB
- 增量更新：仅抓取新增收藏

### 3. 批量操作
避免单条写入，使用 `putMany` 批量提交：
```javascript
// ❌ 慢
for (const post of posts) {
  await putOne('posts', post);
}

// ✅ 快
await putMany('posts', posts);
```

## 发布检查清单

- [ ] 所有模块通过 ESLint 检查
- [ ] 无控制台错误或警告
- [ ] 在 Edge 和 Chrome 中均测试通过
- [ ] manifest.json 版本号递增
- [ ] 更新 README 和 CHANGELOG
- [ ] 清理调试代码和 console.log
- [ ] 压缩为 .zip（不包含 .git、node_modules 等）
- [ ] 截图和使用说明准备好

## 贡献指南

欢迎提交 PR！请确保：
1. 遵循现有代码风格（2 空格缩进、无分号）
2. 为新功能添加注释和 JSDoc
3. 更新相关文档
4. 测试通过后再提交

## 许可证

MIT License
