# Changelog

## 2.0.0 (2026-02-20)

### 重大变更

- **项目重命名**：从 `vue-doctor` 重命名为 `vue-health`
- **仓库迁移**：GitHub 仓库更新为 `https://github.com/zhyt1985/vue-health`
- **目录结构调整**：主包目录从 `packages/vue-doctor` 迁移到 `packages/vue-health`
- 配置文件和文档全面更新以反映新名称

### 破坏性变更

- CLI 命令从 `vue-doctor` 更改为 `vue-health`
- ESLint 插件规则命名空间从 `vue-doctor/*` 更改为 `vue-health/*`
- 配置文件从 `vue-doctor.config.ts` 更改为 `vue-health.config.ts`

## 1.0.0 (2026-02-19)

### 重大变更

- 新增 `--deep` 深度分析模式，使用 ESLint + eslint-plugin-vue + vue-health 自定义规则
- 默认模式保持 oxlint 快速扫描，深度模式提供 Vue 特有问题的深度检查
- 双引擎架构：oxlint（默认） + ESLint `--deep`（可选）

### 新增功能

- 新增 `--deep` 参数，启用 ESLint 深度分析
- 新增 7 条 vue-health 自定义 ESLint 规则：
  - `no-reactive-destructure`: 禁止 ref 对象解构（会导致响应性丢失）
  - `no-ref-in-computed`: 禁止在 computed 中直接使用 ref（会导致响应性丢失）
  - `no-async-watcheffect`: 禁止 async WatchEffect（副作用不会等待异步完成）
  - `no-index-as-key`: 禁止使用 v-for index 作为 :key（会导致 DOM 复用错误）
  - `no-expensive-inline-expression`: 内联表达式禁止昂贵计算
  - `no-giant-component`: 组件代码行数上限（500 行）
  - `no-secrets-in-client`: 禁止前端代码中硬编码密钥
- `require-emits-declaration`: 要求组件声明 emits
- ESLint 配置加载失败时自动 fallback 到内置规则集

### 实战验证

在 4 个主流开源 Vue 项目上完成双引擎验证：

| 项目 | 默认模式 | 深度模式 | 配置 fallback |
|------|----------|----------|---------------|
| VitePress (230 files) | 28 issues / 89分 | 60 issues / 85分 | 内置规则 |
| VueUse (838 files) | 19 issues / 91分 | 149 issues / 85分 | 用户配置→内置 |
| Naive UI (3212 files) | 40 issues / 89分 | 6294 issues / 75分 | 用户配置→内置 |
| vue-pure-admin (490 files) | 60 issues / 90分 | 1046 issues / 71分 | 用户配置→内置 |

## 0.0.2 (2026-02-19)

### Bug Fixes

- **lint**: 排除 `public/`、`dist/`、`**/iconfont/**`、`**/*.min.js`、`**/vendor/**` 等生成/第三方文件目录，避免对非源码文件产生大量误报
- **scoring**: 引入 per-rule 惩罚上限（warning 单规则最多扣 10 分，error 最多扣 15 分），防止同一条规则大量触发导致评分崩塌

### 实战验证

在 4 个主流开源 Vue 项目上完成验证，优化前后评分对比：

| 项目 | 优化前 | 优化后 |
|------|--------|--------|
| VitePress (230 files) | 86 | 89 |
| VueUse (838 files) | 91 | 91 |
| Naive UI (3212 files) | 80 | 89 |
| vue-pure-admin (490 files) | 0 | 90 |

## 0.0.1 (2026-02-18)

初始版本，包含：

- Vue 项目框架自动检测（Vite / Nuxt / Vue CLI / Quasar）
- 基于 oxlint 的 lint 诊断（Vue 核心规则 + 通用规则）
- 基于 knip 的死代码检测
- 健康评分系统（0-100）
- Monorepo / workspace 支持
- `--diff` 增量扫描模式
- `--score` 纯分数输出模式
- `vue-health.config.ts` 配置文件支持
