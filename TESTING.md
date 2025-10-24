# Testing Guide - Linux.do 收藏增强

## 环境准备

### 1. 浏览器要求
- Microsoft Edge 93+ 或 Google Chrome 93+
- 支持 Manifest V3

### 2. 加载扩展

1. 打开浏览器扩展管理页：
   - Edge: `edge://extensions`
   - Chrome: `chrome://extensions`

2. 启用"开发者模式"（右上角开关）

3. 点击"加载已解压的扩展"

4. 选择本仓库的 `extension/` 目录

5. 确认扩展已加载，图标显示正常

## 功能测试清单

### ✅ 基础加载测试

**测试步骤**：
1. 扩展加载后，点击扩展图标旁的"Service Worker"链接
2. 在控制台中应看到：
   ```
   [ldbe] service worker installed
   [ldbe] IndexedDB initialized
   [ldbe] Initialized 25 preset tags
   [ldbe] Initialized default settings
   ```

**验证点**：
- 无红色错误信息
- IndexedDB 数据库 `linuxdo-bookmarks` 已创建
- 预制标签已注入到 `tags` store

---

### ✅ 选项页测试

**测试步骤**：
1. 在扩展管理页点击"详情 → 扩展选项"
2. 填写测试配置：
   - API Base URL: `https://api.openai.com/v1`
   - API Key: `sk-test...`（使用你的实际 Key）
   - Model: `gpt-4o-mini`
3. 调整高级设置（可选）：
   - AI 并发数: 2
   - 抓取并发数: 4
   - 超时时间: 20000
4. 勾选"启用预制标签"
5. 点击"保存"

**验证点**：
- 弹出权限请求对话框（针对 API 域名）
- 保存成功后显示"已保存，并授予 API 域名权限"提示
- 刷新页面后设置保持不变

**额外测试**：
- 点击"恢复默认"：所有设置重置为默认值
- 点击"清除所有数据"：弹出确认对话框，确认后 IndexedDB 被清空

---

### ✅ Content Script 注入测试

**测试步骤**：
1. 访问 `https://linux.do/u/<你的用户名>/activity/bookmarks`
2. 确保已登录 linux.do

**验证点**：
- 右下角出现"收藏增强"按钮（半透明白色背景）
- 按钮悬停时显示提示："Linux.do 收藏增强 (Ctrl/⌘+K)"

---

### ✅ 面板打开与交互测试

**测试步骤**：
1. 点击右下角"收藏增强"按钮 **或** 按 `Ctrl+K`（Mac: `Cmd+K`）
2. 面板从屏幕中上方滑入

**验证点**：
- macOS 风格面板显示，含三色圆点（红黄绿）
- 标题栏显示"Linux.do 收藏增强（基础版）"
- 顶部工具栏有四个按钮：导出、导入、清缓存、设置
- 搜索框占位符："搜索标题 / 支持多标签 AND 筛选"
- 标签区域显示提示或已缓存的标签
- 列表区域显示提示或已缓存的收藏

**交互测试**：
- 点击红色圆点或按 `Esc`：面板关闭
- 点击黄色圆点：面板最小化（关闭）
- 点击绿色圆点：刷新数据
- 点击遮罩层（面板外部）：面板关闭
- 拖拽标题栏：面板可移动

---

### ✅ 收藏抓取测试

**前提**：你的 linux.do 账号至少有几条收藏

**测试步骤**：
1. 打开面板
2. 列表区域显示"正在加载你的收藏..."
3. 等待数据加载（5-30 秒，取决于收藏数量）

**验证点**：
- 列表中显示收藏的帖子（标题、作者、时间）
- 每条帖子显示原生标签（如果有）
- 无错误提示
- 刷新浏览器后，再次打开面板时数据秒加载（来自缓存）

**DevTools 检查**：
- 打开页面 DevTools → Network 选项卡
- 应看到多个请求到 `https://linux.do/u/*/activity/bookmarks.json?page=N`
- 响应状态码 200，返回 JSON 数据

---

### ✅ 搜索与筛选测试

**测试步骤**：
1. 确保列表中有数据
2. 在搜索框输入关键词（如"Docker"）

**验证点**：
- 列表即时过滤，只显示标题包含关键词的帖子
- 清空搜索框，列表恢复全部显示

**标签筛选**：
1. 标签区域显示所有标签及数量
2. 勾选一个标签（如"技术教程"）
3. 列表只显示包含该标签的帖子
4. 勾选第二个标签
5. 列表显示**同时包含两个标签**的帖子（AND 逻辑）
6. 点击"清除筛选"按钮
7. 列表恢复全部显示

---

### ✅ 导出/导入测试

**导出测试**：
1. 打开面板，点击"导出"按钮
2. 浏览器自动下载 JSON 文件（文件名如 `linuxdo_bookmarks_username_2025-10-24.json`）
3. 打开 JSON 文件，验证结构：
   ```json
   {
     "version": 1,
     "origin": "https://linux.do",
     "username": "...",
     "ts": 1234567890,
     "items": [...]
   }
   ```

**导入测试**：
1. 点击"导入"按钮，选择刚导出的 JSON 文件
2. 数据应成功导入并覆盖当前列表
3. 列表更新，显示导入的数据

---

### ✅ IndexedDB 验证

**测试步骤**：
1. 打开 Service Worker DevTools（扩展管理页点击"Service Worker"）
2. 切换到 Application 选项卡
3. 展开 IndexedDB → linuxdo-bookmarks

**验证点**：
- `posts` store：应为空（当前骨架版未持久化到 IDB）
- `tags` store：包含 25 个预制标签
  - 每个标签格式：`{ name: "技术教程", type: "preset", enabled: true, weight: 0 }`
- `classifies` store：应为空
- `settings` store：应为空（设置存在 chrome.storage.local）
- `index_meta` store：应为空

---

### ✅ AI 分类测试（需有效 API）

**前提**：
- 已在选项页配置有效的 API Base、API Key、Model
- 已授予 API 域名权限

**测试步骤**：
1. 打开 Service Worker DevTools 控制台
2. 手动触发测试分类：
   ```javascript
   (async () => {
     const { classifyBatch } = await import('./src/lib/classify.js');
     const { openDB, getAll, putOne } = await import('./src/lib/idb.js');
     await openDB();
     
     // 创建测试帖子
     const testPost = {
       id: 'test-123#1',
       title: 'Docker 容器化部署最佳实践',
       body: '本文介绍如何使用 Docker 进行应用容器化部署...',
       nativeTags: ['docker'],
       author: 'test',
       url: 'https://linux.do/t/test/123',
       favoriteAt: new Date().toISOString(),
     };
     
     await putOne('posts', testPost);
     
     const settings = await chrome.storage.local.get([
       'apiBase', 'apiKey', 'model', 'aiConcurrency', 'bodyCharLimit'
     ]);
     
     const results = await classifyBatch([testPost], settings, (progress) => {
       console.log('Progress:', progress);
     });
     
     console.log('Results:', results);
   })();
   ```

**验证点**：
- 控制台显示进度信息：`Progress: { phase: 'classify', current: 1, total: 1 }`
- 无错误抛出
- 结果格式：`[{ postId: 'test-123#1', tags: ['技术教程', 'Docker'], success: true }]`
- 在 IndexedDB → classifies store 中应看到新记录

**错误排查**：
- 如果报 `E_NOT_CONFIGURED`：检查 API 配置是否保存
- 如果报 `E_HTTP`：检查 API Key 是否有效
- 如果报 `E_BAD_JSON`：AI 返回了非 JSON 格式，会自动重试一次
- 如果报 `E_TIMEOUT`：超时，可增加 timeoutMs 设置

---

### ✅ 快捷键测试

**测试步骤**：
1. 访问 linux.do 收藏页
2. 按 `Ctrl+K`（Mac: `Cmd+K`）

**验证点**：
- 面板打开
- 再按一次，面板关闭（toggle 行为）

**冲突检查**：
1. 打开 `edge://extensions/shortcuts`
2. 查找"Linux.do 收藏增强 → toggle-panel"
3. 确认快捷键未被其他扩展占用

---

### ✅ 权限测试

**测试步骤**：
1. 在选项页保存不同的 API Base（如 `https://api.example.com/v1`）
2. 应弹出权限请求对话框
3. 点击"允许"

**验证点**：
- 在 `edge://extensions` → 扩展详情 → 站点访问权限中应看到新域名
- Service Worker 中可成功发起到该域名的请求

---

## 性能测试

### 大数据量测试

**模拟 1000+ 收藏**（仅测试渲染性能）：
1. 打开 Service Worker DevTools 控制台
2. 注入大量测试数据：
   ```javascript
   (async () => {
     const items = [];
     for (let i = 0; i < 1000; i++) {
       items.push({
         title: `测试帖子 ${i}`,
         href: `https://linux.do/t/test/${i}`,
         tags: ['技术教程', 'Docker', '网络配置'].slice(0, i % 3 + 1),
         author: `user${i % 10}`,
         time: new Date().toISOString(),
       });
     }
     const key = 'ldbe_cache_v1:test';
     const payload = {}; payload[key] = { ts: Date.now(), items };
     await chrome.storage.local.set(payload);
     console.log('测试数据已注入，刷新面板查看');
   })();
   ```
3. 刷新面板，观察渲染速度

**验证点**：
- 列表应在 2 秒内渲染完成（当前未实现虚拟列表，大数据量会有性能问题）
- 滚动时无明显卡顿（小于 500 条）

---

## 回归测试脚本

将来可自动化的测试用例：

```javascript
// tests/integration.test.js
describe('Linux.do Extension', () => {
  test('IndexedDB initialization', async () => {
    const db = await openDB();
    expect(db.objectStoreNames).toContain('posts');
    expect(db.objectStoreNames).toContain('tags');
  });

  test('Preset tags injection', async () => {
    const tags = await getAll('tags');
    expect(tags.length).toBeGreaterThanOrEqual(25);
  });

  test('AI classify with valid input', async () => {
    const results = await classifyBatch([testPost], settings);
    expect(results[0].success).toBe(true);
    expect(results[0].tags.length).toBeGreaterThan(0);
  });
});
```

---

## 已知问题

1. **虚拟列表未实现**：超过 500 条收藏时滚动性能下降
2. **Content Script 与新协议集成待完成**：当前 content.js 未调用 Service Worker 的分类接口
3. **SVG 图标兼容性**：部分旧版浏览器可能不支持 SVG 作为扩展图标

---

## 报告问题

如果发现 bug，请提供：
1. 浏览器版本（如 Edge 119.0.2151.72）
2. 扩展版本（manifest.json 中的 version）
3. 重现步骤
4. Service Worker 控制台错误日志
5. 截图或录屏
