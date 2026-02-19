import type { Rule } from "eslint";

export const noAsyncWatcheffect: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow async callback in watchEffect(), which prevents proper cleanup",
    },
    messages: {
      noAsync:
        "Avoid async watchEffect callback — the cleanup function won't work as expected. Use a sync callback with async operations inside.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node: any) {
        if (
          node.callee?.type === "Identifier" &&
          (node.callee.name === "watchEffect" || node.callee.name === "watchPostEffect" || node.callee.name === "watchSyncEffect") &&
          node.arguments.length > 0
        ) {
          const callback = node.arguments[0];
          if (callback.async === true) {
            context.report({ node: callback, messageId: "noAsync" });
          }
        }
      },
    };
  },
};
