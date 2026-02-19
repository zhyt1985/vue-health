import { RuleTester } from "eslint";
import * as vueParser from "vue-eslint-parser";
import { it } from "vitest";
import { noIndexAsKey } from "../eslint-plugin/rules/no-index-as-key.js";
import { noExpensiveInlineExpression } from "../eslint-plugin/rules/no-expensive-inline-expression.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parser: vueParser as any,
  },
});

it("no-index-as-key", () => {
  ruleTester.run("no-index-as-key", noIndexAsKey as any, {
    valid: [
      '<template><div v-for="item in items" :key="item.id">{{ item }}</div></template>',
      '<template><div v-for="(item, index) in items" :key="item.id">{{ item }}</div></template>',
      '<template><div v-for="item in items">{{ item }}</div></template>',
    ],
    invalid: [
      {
        code: '<template><div v-for="(item, index) in items" :key="index">{{ item }}</div></template>',
        errors: [{ messageId: "noIndexKey" }],
      },
    ],
  });
});

it("no-expensive-inline-expression", () => {
  ruleTester.run("no-expensive-inline-expression", noExpensiveInlineExpression as any, {
    valid: [
      '<template><div>{{ items }}</div></template>',
      '<template><div>{{ items.filter(x => x) }}</div></template>',
      '<template><div>{{ computedItems }}</div></template>',
    ],
    invalid: [
      {
        code: '<template><div>{{ items.filter(x => x.active).map(x => x.name) }}</div></template>',
        errors: [{ messageId: "noExpensiveInline" }],
      },
    ],
  });
});
