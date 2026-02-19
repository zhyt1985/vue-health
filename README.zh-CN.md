# vue-health

一条命令，诊断你的 Vue 代码库健康状况。

[English](./README.md) | 中文

```bash
npx vue-health .
```

```
vue-health v0.0.1

  Nuxt (Vue ^3.5.0) · 128 source files

✔ Found 12 lint issues
✔ Found 3 dead code issues

 ✗ Mutating props directly
    Use `emit('update:propName', newValue)` or a local data copy

 ⚠ Unused component (3)
    Remove the unused component import or use it in the template

 ⚠ Using v-if with v-for (2)
    Move v-if to a wrapper element or use computed to filter the list

────────────────────────────────────────

  ( ◕‿◕)  Vue Doctor — my-app

  Score: 87/100 Good
  ███████████████████████████████████████████░░░░░░░

  Framework: Nuxt · Vue: ^3.5.0 · Issues: 15 · Time: 1.2s
```

## 特性

- **极速** — 基于 [oxlint](https://oxc.rs)（Rust 实现），而非 ESLint
- **40+ 条 Vue 规则** — 覆盖正确性、性能、安全、死代码四大类
- **零配置** — 自动检测 Nuxt / Vite / Vue CLI / Quasar 框架
- **死代码检测** — 通过 [knip](https://knip.dev) 发现未使用的文件、导出和类型
- **Diff 模式** — 仅扫描当前分支变更的文件，适合 CI/PR 场景
- **Monorepo 支持** — 可选择扫描 workspace 中的特定项目
- **可编程** — `import { diagnose } from "vue-health/api"`

## 安装

```bash
# 直接运行（无需安装）
npx vue-health .

# 或全局安装
npm i -g vue-health
```

需要 Node.js >= 20。

## 命令行

```
Usage: vue-health [options] [directory]

Arguments:
  directory          要扫描的项目目录（默认 "."）

Options:
  -v, --version      显示版本号
  --no-lint          跳过 lint 检查
  --no-dead-code     跳过死代码检测
  --verbose          显示每条规则的文件详情
  --score            仅输出分数
  -y, --yes          跳过交互提示，扫描所有 workspace 项目
  --project <names>  指定 workspace 项目（逗号分隔）
  --diff [base]      仅扫描相对于 base 分支变更的文件
  -h, --help         显示帮助信息
```

### 示例

```bash
# 扫描当前目录
vue-health .

# 仅输出分数（适合 CI）
vue-health . --score

# 仅扫描相对于 main 分支的变更文件
vue-health . --diff

# 显示文件级别详情
vue-health . --verbose

# 跳过死代码检测
vue-health . --no-dead-code

# 扫描指定的 workspace 项目
vue-health . --project my-app
```

## Node.js API

```ts
import { diagnose } from "vue-health/api";

const { diagnostics, score } = await diagnose("./my-vue-app");

console.log(score);
// { score: 87, label: "Good" }

console.log(diagnostics[0]);
// {
//   filePath: "src/components/Foo.vue",
//   rule: "no-mutating-props",
//   severity: "error",
//   message: "Mutating props directly",
//   help: "Use emit('update:propName', newValue) or a local data copy",
//   category: "Correctness",
//   line: 42,
//   column: 5
// }
```

## 规则

### 正确性

| 规则 | 说明 |
|------|------|
| `no-mutating-props` | 禁止直接修改 props |
| `no-ref-as-operand` | 在 script 中使用 `.value` 访问 ref |
| `no-setup-props-reactivity-loss` | 解构 props 时保持响应性 |
| `no-side-effects-in-computed-properties` | 计算属性应为纯函数 |
| `no-async-in-computed-properties` | 计算属性中禁止异步操作 |
| `no-lifecycle-after-await` | 生命周期钩子必须在 setup 的 `await` 之前注册 |
| `no-watch-after-await` | `watch()` 必须在 setup 的 `await` 之前调用 |
| `no-shared-component-data` | `data()` 必须返回新对象 |
| `no-dupe-keys` | data/computed/methods 中不允许重复键名 |
| `return-in-computed-property` | 计算属性必须有返回值 |
| `valid-v-model` | v-model 需要可写的表达式 |
| `valid-v-for` / `valid-v-if` / `valid-v-on` / `valid-v-bind` / `valid-v-slot` | 模板指令校验 |
| `require-v-for-key` | v-for 元素必须绑定 `:key` |
| ... | 共 40+ 条规则 |

### 性能

| 规则 | 说明 |
|------|------|
| `no-use-v-if-with-v-for` | 禁止在同一元素上同时使用 v-if 和 v-for |

### 安全

| 规则 | 说明 |
|------|------|
| `no-v-html` | `v-html` 可能导致 XSS，应使用文本插值或对内容进行消毒 |

### 死代码（via knip）

| 规则 | 说明 |
|------|------|
| `no-unused-components` | 移除未使用的组件导入 |
| `no-unused-vars` | 移除未使用的变量 |
| 未使用的文件 | 未被任何文件导入的文件 |
| 未使用的导出/类型 | 导出了但从未被消费的符号 |

## 评分

分数范围 0–100，根据诊断数量和严重程度计算：

| 分数区间 | 等级 | 表情 |
|----------|------|------|
| 75–100 | Good | `( ◕‿◕)` |
| 50–74 | OK | `( ◑‿◑)` |
| 0–49 | Needs Work | `( ◉_◉)` |

error 的权重是 warning 的 3 倍。

## 配置

在项目根目录创建 `.vue-healthrc` 或 `.vue-healthrc.json`：

```json
{
  "lint": true,
  "deadCode": true,
  "verbose": false,
  "diff": false,
  "ignore": {
    "rules": ["no-v-html"],
    "files": ["src/legacy/**"]
  }
}
```

## 支持的框架

通过 `package.json` 依赖或配置文件自动检测：

- **Nuxt** — `nuxt.config.ts`
- **Vite** — `vite.config.ts`
- **Vue CLI** — `vue.config.js`
- **Quasar** — `@quasar/app-vite` 或 `@quasar/app-webpack`

同时检测 TypeScript（`tsconfig.json`）和 Vue 版本。

## 许可证

MIT
