import type { ESLint, Linter } from "eslint";
import { noAsyncWatcheffect } from "./rules/no-async-watcheffect.js";
import { noExpensiveInlineExpression } from "./rules/no-expensive-inline-expression.js";
import { noGiantComponent } from "./rules/no-giant-component.js";
import { noIndexAsKey } from "./rules/no-index-as-key.js";
import { noReactiveDestructure } from "./rules/no-reactive-destructure.js";
import { noRefInComputed } from "./rules/no-ref-in-computed.js";
import { noSecretsInClient } from "./rules/no-secrets-in-client.js";
import { requireEmitsDeclaration } from "./rules/require-emits-declaration.js";

const rules: Record<string, any> = {
  "no-reactive-destructure": noReactiveDestructure,
  "no-ref-in-computed": noRefInComputed,
  "no-async-watcheffect": noAsyncWatcheffect,
  "no-index-as-key": noIndexAsKey,
  "no-expensive-inline-expression": noExpensiveInlineExpression,
  "no-giant-component": noGiantComponent,
  "no-secrets-in-client": noSecretsInClient,
  "require-emits-declaration": requireEmitsDeclaration,
};

const plugin: ESLint.Plugin & { configs: Record<string, Linter.Config> } = {
  meta: {
    name: "eslint-plugin-vue-doctor",
    version: "0.0.1",
  },
  rules,
  configs: {},
};

plugin.configs.recommended = {
  plugins: { "vue-doctor": plugin as any },
  rules: {
    "vue-doctor/no-reactive-destructure": "error",
    "vue-doctor/no-ref-in-computed": "error",
    "vue-doctor/no-async-watcheffect": "warn",
    "vue-doctor/no-index-as-key": "warn",
    "vue-doctor/no-expensive-inline-expression": "warn",
    "vue-doctor/no-giant-component": "warn",
    "vue-doctor/no-secrets-in-client": "error",
    "vue-doctor/require-emits-declaration": "warn",
  },
};

export default plugin;
