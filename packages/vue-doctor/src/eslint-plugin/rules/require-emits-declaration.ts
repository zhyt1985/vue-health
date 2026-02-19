import type { Rule } from "eslint";

export const requireEmitsDeclaration: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require defineEmits() when using emit() in <script setup>",
    },
    messages: {
      requireEmits:
        "emit() is called but defineEmits() is not declared. Add defineEmits() to document component events.",
    },
    schema: [],
  },
  create(context) {
    let hasDefineEmits = false;
    let emitNodes: any[] = [];

    return {
      Program() {
        hasDefineEmits = false;
        emitNodes = [];
      },
      CallExpression(node: any) {
        if (
          node.callee?.type === "Identifier" &&
          node.callee.name === "defineEmits"
        ) {
          hasDefineEmits = true;
        }
      },
      // Detect `const emit = defineEmits()` pattern — already handled above
      // Detect `emit('eventName')` calls
      "CallExpression:exit"(node: any) {
        if (
          node.callee?.type === "Identifier" &&
          node.callee.name === "emit" &&
          node.arguments.length > 0
        ) {
          emitNodes.push(node);
        }
      },
      "Program:exit"() {
        if (!hasDefineEmits && emitNodes.length > 0) {
          for (const node of emitNodes) {
            context.report({ node, messageId: "requireEmits" });
          }
        }
      },
    };
  },
};
