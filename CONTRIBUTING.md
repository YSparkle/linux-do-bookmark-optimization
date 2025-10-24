# Contributing to Linux.do 收藏增强

感谢你考虑为本项目贡献！以下是一些指导原则。

## 如何贡献

### 报告 Bug

如果发现 bug，请在 GitHub Issues 中提交，包含：

1. **清晰的标题**：简洁描述问题
2. **重现步骤**：详细的操作步骤
3. **预期行为**：你期望发生什么
4. **实际行为**：实际发生了什么
5. **环境信息**：
   - 浏览器版本（如 Edge 119.0.2151.72）
   - 扩展版本（manifest.json 中的 version）
   - 操作系统（Windows 11 / macOS 14 / Ubuntu 22.04）
6. **日志**：Service Worker 控制台错误日志（如果有）
7. **截图/录屏**：可视化问题（如果适用）

### 功能建议

在 GitHub Issues 中提交功能请求，说明：

1. **使用场景**：为什么需要这个功能
2. **预期行为**：功能应该如何工作
3. **替代方案**：你考虑过的其他解决方案
4. **优先级**：对你的重要程度（低/中/高）

### 提交 Pull Request

#### 准备工作

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 确保你的代码遵循项目风格（见下文）

#### 代码规范

**JavaScript 风格**：
- 2 空格缩进
- 无分号（除非语法必需）
- 使用 ES6+ 特性（箭头函数、async/await、解构）
- 单引号字符串
- 驼峰命名（camelCase for variables/functions, PascalCase for classes）

**注释**：
- 为公共 API 添加 JSDoc 注释
- 复杂逻辑添加行内注释
- 注释用中文或英文均可

**示例**：
```javascript
/**
 * 批量分类帖子
 * @param {Object[]} posts - 帖子数组
 * @param {Object} settings - 设置对象
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object[]>} 分类结果
 */
export async function classifyBatch(posts, settings, onProgress) {
  const { aiConcurrency = 2 } = settings
  
  // 过滤已锁定帖子
  const toClassify = posts.filter(p => !p.locked)
  
  // ... 实现逻辑
}
```

#### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（不增加功能也不修复 bug）
- `perf`: 性能优化
- `test`: 添加测试
- `chore`: 构建工具或辅助工具变动

**示例**：
```
feat(classify): add batch size limit to prevent API quota exhaustion

- Limit classification batch to 100 posts by default
- Add batchLimit setting in options page
- Update documentation

Closes #42
```

#### 测试

在提交前确保：

1. **本地测试**：
   - 在 Edge/Chrome 中加载扩展
   - 验证所有功能正常工作
   - 检查 Service Worker 控制台无错误

2. **语法检查**：
   ```bash
   cd extension/
   for f in src/**/*.js; do node --check "$f"; done
   ```

3. **Manifest 验证**：
   ```bash
   python3 -m json.tool manifest.json > /dev/null
   ```

4. **功能回归**：参考 TESTING.md 中的测试清单

#### 提交 PR

1. 推送到你的 fork：`git push origin feature/my-feature`
2. 在 GitHub 上创建 Pull Request
3. 填写 PR 模板（如果有）
4. 等待代码审查

**PR 标题格式**：
```
[类型] 简短描述

例如：
[feat] 添加虚拟列表支持
[fix] 修复 AI 分类超时问题
[docs] 更新安装指南
```

## 开发环境设置

### 必需工具
- Node.js 16+ (用于语法检查)
- Python 3 (用于 JSON 验证)
- Git

### 推荐工具
- VSCode + ESLint 插件
- Chrome DevTools

### 本地调试

1. 克隆仓库并进入扩展目录：
   ```bash
   cd extension/
   ```

2. 加载扩展（见 DEVELOPMENT.md）

3. 实时调试：
   - 修改代码后，在 `edge://extensions` 点击"重新加载"
   - Service Worker 会自动重启
   - Content Script 需要刷新页面

## 代码审查流程

所有 PR 需通过以下检查：

1. **代码风格**：符合项目规范
2. **功能测试**：至少一位维护者验证通过
3. **文档更新**：如果改动影响 API 或用法
4. **CHANGELOG**：重要改动需添加条目

## 社区准则

- 尊重他人
- 欢迎新手提问
- 建设性反馈
- 避免离题讨论

## 许可证

贡献即表示你同意将代码按 MIT License 授权。

## 联系方式

- GitHub Issues: [项目 Issues 页面]
- Email: [维护者邮箱]（如果提供）

## 感谢

感谢所有贡献者！你们的努力让这个项目更好。

贡献者名单（按首次贡献时间）：
- [@username] - 功能 A
- [@username] - Bug 修复 B
