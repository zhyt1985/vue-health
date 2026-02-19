import type { Rule } from "eslint";

const REF_FUNCTIONS = new Set(["ref", "shallowRef", "customRef", "toRef"]);

export const noRefInComputed: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow creating ref() inside computed(), which causes memory leaks",
    },
    messages: {
      noRefInComputed:
        "Creating {{ name }}() inside computed() causes a new ref on every re-evaluation. Move it outside.",
    },
    schema: [],
  },
  create(context) {
    let insideComputed = false;

    return {
      CallExpression(node: any) {
        if (
          node.callee?.type === "Identifier" &&
          node.callee.name === "computed"
        ) {
          insideComputed = true;
        } else if (
          insideComputed &&
          node.callee?.type === "Identifier" &&
          REF_FUNCTIONS.has(node.callee.name)
        ) {
          context.report({
            node,
            messageId: "noRefInComputed",
            data: { name: node.callee.name },
          });
        }
      },
      "CallExpression:exit"(node: any) {
        if (
          node.callee?.type === "Identifier" &&
          node.callee.name === "computed"
        ) {
          insideComputed = false;
        }
      },
    };
  },
};
