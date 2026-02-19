import { RuleTester } from "eslint";
import { it } from "vitest";
import { noReactiveDestructure } from "../eslint-plugin/rules/no-reactive-destructure.js";
import { noRefInComputed } from "../eslint-plugin/rules/no-ref-in-computed.js";
import { noAsyncWatcheffect } from "../eslint-plugin/rules/no-async-watcheffect.js";
import { noGiantComponent } from "../eslint-plugin/rules/no-giant-component.js";
import { noSecretsInClient } from "../eslint-plugin/rules/no-secrets-in-client.js";
import { requireEmitsDeclaration } from "../eslint-plugin/rules/require-emits-declaration.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

it("no-reactive-destructure", () => {
  ruleTester.run("no-reactive-destructure", noReactiveDestructure as any, {
    valid: [
      "const state = reactive({ count: 0 })",
      "const { a } = toRefs(state)",
      "const { a } = someOtherFunction()",
    ],
    invalid: [
      {
        code: "const { count } = reactive({ count: 0 })",
        errors: [{ messageId: "noDestructure" }],
      },
      {
        code: "const { a, b } = reactive({ a: 1, b: 2 })",
        errors: [{ messageId: "noDestructure" }],
      },
    ],
  });
});

it("no-ref-in-computed", () => {
  ruleTester.run("no-ref-in-computed", noRefInComputed as any, {
    valid: [
      "const x = ref(0); const doubled = computed(() => x.value * 2)",
      "const x = computed(() => someValue + 1)",
    ],
    invalid: [
      {
        code: "const doubled = computed(() => ref(0))",
        errors: [{ messageId: "noRefInComputed" }],
      },
      {
        code: "const doubled = computed(() => shallowRef(0))",
        errors: [{ messageId: "noRefInComputed" }],
      },
    ],
  });
});

it("no-async-watcheffect", () => {
  ruleTester.run("no-async-watcheffect", noAsyncWatcheffect as any, {
    valid: [
      "watchEffect(() => { console.log('sync') })",
      "watchEffect(() => { fetch('/api') })",
      "watchPostEffect(() => { console.log('sync') })",
    ],
    invalid: [
      {
        code: "watchEffect(async () => { await fetch('/api') })",
        errors: [{ messageId: "noAsync" }],
      },
      {
        code: "watchPostEffect(async () => { await fetch('/api') })",
        errors: [{ messageId: "noAsync" }],
      },
      {
        code: "watchSyncEffect(async () => { await fetch('/api') })",
        errors: [{ messageId: "noAsync" }],
      },
    ],
  });
});

it("no-giant-component", () => {
  ruleTester.run("no-giant-component", noGiantComponent as any, {
    valid: ["const x = 1;"],
    invalid: [
      {
        code: Array.from({ length: 301 }, (_, i) => `const x${i} = ${i};`).join("\n"),
        errors: [{ messageId: "tooLarge" }],
      },
    ],
  });
});

it("no-giant-component (custom threshold)", () => {
  ruleTester.run("no-giant-component (custom threshold)", noGiantComponent as any, {
    valid: [],
    invalid: [
      {
        code: Array.from({ length: 51 }, (_, i) => `const x${i} = ${i};`).join("\n"),
        options: [{ threshold: 50 }],
        errors: [{ messageId: "tooLarge" }],
      },
    ],
  });
});

it("no-secrets-in-client", () => {
  ruleTester.run("no-secrets-in-client", noSecretsInClient as any, {
    valid: [
      "const key = import.meta.env.VITE_API_KEY",
      'const x = "short"',
      'const x = "this is a normal string without secrets"',
    ],
    invalid: [
      {
        code: 'const key = "sk-live-abcdefghijklmnopqrstuvwxyz1234567890"',
        errors: [{ messageId: "noSecret" }],
      },
      {
        code: 'const key = "AIzaSyAbcdefghijklmnopqrstuvwxyz1234567890"',
        errors: [{ messageId: "noSecret" }],
      },
      {
        code: 'const key = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"',
        errors: [{ messageId: "noSecret" }],
      },
    ],
  });
});

it("require-emits-declaration", () => {
  ruleTester.run("require-emits-declaration", requireEmitsDeclaration as any, {
    valid: [
      'const emit = defineEmits(["click"]); emit("click")',
      "const x = 1;",
    ],
    invalid: [
      {
        code: 'emit("click")',
        errors: [{ messageId: "requireEmits" }],
      },
      {
        code: 'emit("click"); emit("change")',
        errors: [
          { messageId: "requireEmits" },
          { messageId: "requireEmits" },
        ],
      },
    ],
  });
});
