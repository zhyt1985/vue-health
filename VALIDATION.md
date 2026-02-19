# vue-doctor 实战验证报告

日期：2026-02-19
版本：v1.0.0
运行参数：`--no-dead-code -y --verbose`

## 优化前

| 项目 | .vue 文件数 | 源文件总数 | 框架检测 | Vue 版本 | Issues | 评分 | 耗时 |
|------|------------|-----------|---------|---------|--------|------|------|
| VitePress | 98 | 230 | Vite | ^3.5.27 | 28 | 86/100 Good | 363ms |
| VueUse | 212 | 838 | Vite | catalog:dev | 19 | 91/100 Good | 390ms |
| Naive UI | 1703 | 3211 | Vite | ^3.5.21 | 40 | 80/100 Good | 439ms |
| vue-pure-admin | 255 | 490 | Vite | ^3.5.28 | 326 | 0/100 Needs Work | 498ms |

## 优化后（实测）

| 项目 | Issues | 评分 | 耗时 |
|------|--------|------|------|
| VitePress | 28 | 89/100 Good | 138ms |
| VueUse | 19 | 91/100 Good | 133ms |
| Naive UI | 40 | 89/100 Good | 176ms |
| vue-pure-admin | 60 | 90/100 Good | 120ms |

## 结论

- 4 个项目均正常完成扫描，无崩溃或异常退出
- 框架检测全部正确识别为 Vite
- Vue 版本正确读取自 package.json
- 评分分布合理：4 个维护良好的项目均在 89-91 分
- 性能优秀：3212 个源文件的 Naive UI 仅需 176ms

## 优化记录

### 1. 排除生成文件（run-oxlint.ts）

oxlint 扫描了 `public/`、`dist/` 等目录下的生成文件，导致 vue-pure-admin 的 `public/wasm/*.js` 产生 239 个误报。

修复：添加 `--ignore-pattern` 排除 `public/**`、`dist/**`、`.output/**`、`.nuxt/**`、`**/iconfont/**`、`**/*.min.js`、`**/vendor/**` 等常见生成/第三方目录。

### 2. 同规则惩罚封顶（calculate-score.ts）

同一条规则（如 `no-unused-expressions`）触发 75 次会线性累加 75 分惩罚，导致评分归零。

修复：引入 per-rule cap，warning 类规则最多计 10 分惩罚，error 类最多 15 分。避免单一规则主导整体评分。

---

## 双引擎验证：oxlint vs ESLint `--deep`

日期：2026-02-19
运行参数：`--no-dead-code -y --verbose`（深度模式追加 `--deep`）

### 对比结果

| 项目 | 模式 | Issues | 评分 | 耗时 | 状态 |
|------|------|--------|------|------|------|
| VitePress | oxlint（默认） | 28 | 89/100 Good | 160ms | ✅ |
| VitePress | ESLint（--deep） | 60 | 85/100 Good | 248ms | ✅ |
| VueUse | oxlint（默认） | 19 | 91/100 Good | 161ms | ✅ |
| VueUse | ESLint（--deep） | 149 | 85/100 Good | 272ms | ✅ |
| Naive UI | oxlint（默认） | 40 | 89/100 Good | 182ms | ✅ |
| Naive UI | ESLint（--deep） | 6294 | 75/100 Good | 853ms | ✅ |
| vue-pure-admin | oxlint（默认） | 60 | 90/100 Good | 143ms | ✅ |
| vue-pure-admin | ESLint（--deep） | 1046 | 71/100 OK | 359ms | ✅ |

### ESLint 配置 Fallback 情况

| 项目 | 用户 eslint 配置 | --deep 使用的配置 |
|------|-----------------|------------------|
| VitePress | 无 | 内置规则集（eslint-plugin-vue + vue-doctor 自定义规则） |
| VueUse | `eslint.config.js`（依赖 `@antfu/eslint-config`，未安装） | Fallback 到内置规则集 |
| Naive UI | `eslint.config.mjs`（依赖未安装） | Fallback 到内置规则集 |
| vue-pure-admin | `eslint.config.js`（依赖未安装） | Fallback 到内置规则集 |

注：四个项目均为 shallow clone（`--depth 1`），未执行 `npm install`，因此有用户配置的三个项目的外部依赖均不可用。`runEslint` 在加载用户配置失败时自动 fallback 到内置规则集，确保深度分析不会因配置问题而中断。

### 深度模式发现的典型问题（oxlint 未覆盖）

**vue-doctor 自定义规则命中：**
- `vue-doctor/no-index-as-key` — vue-pure-admin 中 12 处使用 v-for index 作为 :key
- `vue-doctor/no-reactive-destructure` — VueUse、vue-pure-admin 中发现 ref 对象解构导致响应性丢失

**eslint-plugin-vue 高价值规则命中：**
- `vue/prefer-use-template-ref` — VitePress 3 处、vue-pure-admin 58 处应使用 `useTemplateRef` 替代 `ref`
- `vue/no-undef-components` — VitePress 5 处、VueUse 62 处、vue-pure-admin 848 处使用了未定义组件
- `vue/no-v-html` — VitePress 7 处、vue-pure-admin 3 处存在 XSS 风险
- `vue/no-empty-component-block` — Naive UI 5 处空 `<style>` 块
- `vue/component-api-style` — VueUse 2 处、vue-pure-admin 2 处使用了 Options API
- `vue/block-order` — vue-pure-admin 3 处 `<script>` 未放在 `<template>` 之前

### 结论

1. 默认模式（oxlint）结果与之前验证一致，评分无偏差
2. 深度模式（ESLint `--deep`）在四个项目上均正常完成，无崩溃
3. 深度模式发现了大量 oxlint 未覆盖的 Vue 特有问题，尤其是 `vue/no-undef-components`、`vue/prefer-use-template-ref` 和 vue-doctor 自定义规则
4. 配置 fallback 机制正常工作：用户配置加载失败时自动降级到内置规则集
5. 深度模式耗时约为默认模式的 1.5-5 倍，但仍在秒级完成（最大项目 Naive UI 3212 文件仅需 853ms）
6. 修复了 `runEslint` 中用户配置加载失败时未 fallback 的 bug
