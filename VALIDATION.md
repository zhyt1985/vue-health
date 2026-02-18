# vue-doctor 实战验证报告

日期：2026-02-19
版本：v0.0.1
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
