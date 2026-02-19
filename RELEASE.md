# 版本发布流程

本文档记录 vue-health 项目版本发布的标准流程和注意事项。

## 版本号规则

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

| 版本类型 | 格式 | 使用场景 |
|---------|------|---------|
| Major | `1.0.0` → `2.0.0` | 规则机制发生重要变化、破坏性变更 |
| Minor | `1.0.0` → `1.1.0` | 新增功能、向后兼容的特性 |
| Patch | `1.0.0` → `1.0.1` | Bug 修复、文档更新 |

## 发布流程

### 1. 版本号修改

```bash
# 修改 packages/vue-health/package.json 中的 version 字段
# 同时更新 VALIDATION.md 中的版本号（如果需要）
```

### 2. 更新 CHANGELOG.md

在 CHANGELOG.md 顶部添加新版本条目，包含：

```markdown
## X.Y.Z (YYYY-MM-DD)

### 重大变更 / 新增功能 / Bug Fixes

- 描述变更内容

### 实战验证（如有）

| 项目 | 默认模式 | 深度模式 |
|------|----------|----------|
```

### 3. 代码提交

```bash
git add -A
git commit -m "feat: vX.Y.Z — 简短描述

详细描述：
- 变更点1
- 变更点2"
```

### 4. 推送到远程

```bash
# 先拉取远程更新（如有）
git pull origin main --rebase

# 推送
git push origin main
```

## 版本发布记录

### 1.0.0 (2026-02-19)

**发布类型：** Major（规则机制重大变更）

**变更内容：**
- 新增 `--deep` 深度分析模式（ESLint + eslint-plugin-vue + vue-health 自定义规则）
- 双引擎架构：oxlint（默认快速） + ESLint `--deep`（可选深度）
- 新增 7 条 vue-health 自定义 ESLint 规则
- ESLint 配置加载失败时自动 fallback 到内置规则集

**验证数据：**
- 4 个开源项目双引擎验证全部通过
- 提交：`e5588d8`

**经验总结：**
- 深度模式能发现 oxlint 未覆盖的 Vue 特有问题
- 配置 fallback 机制确保在 shallow clone（无 node_modules）场景下也能正常运行
- Naive UI 深度模式发现 6294 个问题（主要是 demo 文件中使用了全局注册组件）
