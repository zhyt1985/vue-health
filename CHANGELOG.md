# Changelog

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
- `vue-doctor.config.ts` 配置文件支持
