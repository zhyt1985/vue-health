import type { Rule } from "eslint";

export const noReactiveDestructure: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow destructuring reactive() return value, which loses reactivity",
    },
    messages: {
      noDestructure:
        "Destructuring reactive() loses reactivity. Use toRefs() or access properties directly.",
    },
    schema: [],
  },
  create(context) {
    return {
      VariableDeclarator(node: any) {
        if (
          node.id.type === "ObjectPattern" &&
          node.init?.type === "CallExpression" &&
          node.init.callee?.type === "Identifier" &&
          node.init.callee.name === "reactive"
        ) {
          context.report({ node, messageId: "noDestructure" });
        }
      },
    };
  },
};
