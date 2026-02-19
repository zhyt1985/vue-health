# vue-health

English | [中文](./README.zh-CN.md)

One command to diagnose your Vue codebase health.

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

## Features

- **Fast** — powered by [oxlint](https://oxc.rs) (Rust), not ESLint
- **40+ Vue rules** — correctness, performance, security, dead code
- **Zero config** — auto-detects Nuxt / Vite / Vue CLI / Quasar
- **Dead code detection** — unused files, exports, and types via [knip](https://knip.dev)
- **Diff mode** — only scan changed files on your branch
- **Monorepo support** — select which workspace projects to scan
- **Programmable** — `import { diagnose } from "vue-health/api"`

## Install

```bash
# Run directly (no install needed)
npx vue-health .

# Or install globally
npm i -g vue-health
```

Requires Node.js >= 20.

## CLI

```
Usage: vue-health [options] [directory]

Arguments:
  directory          project directory to scan (default: ".")

Options:
  -v, --version      display the version number
  --no-lint          skip linting
  --no-dead-code     skip dead code detection
  --verbose          show file details per rule
  --score            output only the score
  -y, --yes          skip prompts, scan all workspace projects
  --project <names>  select workspace project (comma-separated)
  --diff [base]      scan only files changed vs base branch
  -h, --help         display help for command
```

### Examples

```bash
# Scan current directory
vue-health .

# Only show the score (useful in CI)
vue-health . --score

# Scan only changed files vs main
vue-health . --diff

# Scan with file-level details
vue-health . --verbose

# Skip dead code detection
vue-health . --no-dead-code

# Scan a specific workspace project
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

## Rules

### Correctness

| Rule | Description |
|------|-------------|
| `no-mutating-props` | Don't mutate props directly |
| `no-ref-as-operand` | Use `.value` to access refs in script |
| `no-setup-props-reactivity-loss` | Maintain reactivity when destructuring props |
| `no-side-effects-in-computed-properties` | Computed properties should be pure |
| `no-async-in-computed-properties` | No async in computed — use watchers |
| `no-lifecycle-after-await` | Lifecycle hooks must be before `await` in setup |
| `no-watch-after-await` | `watch()` must be before `await` in setup |
| `no-shared-component-data` | `data()` must return a fresh object |
| `no-dupe-keys` | No duplicate keys across data/computed/methods |
| `return-in-computed-property` | Computed properties must return a value |
| `valid-v-model` | v-model needs a writable expression |
| `valid-v-for` / `valid-v-if` / `valid-v-on` / `valid-v-bind` / `valid-v-slot` | Template directive validation |
| `require-v-for-key` | `:key` is required on v-for elements |
| ... | 40+ rules total |

### Performance

| Rule | Description |
|------|-------------|
| `no-use-v-if-with-v-for` | Don't use v-if and v-for on the same element |

### Security

| Rule | Description |
|------|-------------|
| `no-v-html` | `v-html` can lead to XSS — sanitize or use interpolation |

### Dead Code (via knip)

| Rule | Description |
|------|-------------|
| `no-unused-components` | Remove unused component imports |
| `no-unused-vars` | Remove unused variables |
| Unused files | Files not imported anywhere |
| Unused exports / types | Exported symbols never consumed |

## Scoring

Score is 0–100, calculated from diagnostic count and severity:

| Range | Label | Indicator |
|-------|-------|-----------|
| 75–100 | Good | `( ◕‿◕)` |
| 50–74 | OK | `( ◑‿◑)` |
| 0–49 | Needs Work | `( ◉_◉)` |

Errors weigh 3x more than warnings.

## Configuration

Create `.vue-healthrc` or `.vue-healthrc.json` in your project root:

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

## Supported Frameworks

Auto-detected from `package.json` or config files:

- **Nuxt** — `nuxt.config.ts`
- **Vite** — `vite.config.ts`
- **Vue CLI** — `vue.config.js`
- **Quasar** — `@quasar/app-vite` or `@quasar/app-webpack`

Also detects TypeScript (`tsconfig.json`) and Vue version.

## License

MIT
