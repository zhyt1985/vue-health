import type { Rule } from "eslint";

const EXPENSIVE_METHODS = new Set(["filter", "map", "reduce", "sort", "flatMap", "find", "some", "every"]);

const checkChainedCalls = (node: any): boolean => {
  if (
    node.type !== "CallExpression" ||
    node.callee?.type !== "MemberExpression"
  )
    return false;

  const methodName =
    node.callee.property?.type === "Identifier"
      ? node.callee.property.name
      : null;

  if (!methodName || !EXPENSIVE_METHODS.has(methodName)) return false;

  const obj = node.callee.object;
  if (
    obj?.type === "CallExpression" &&
    obj.callee?.type === "MemberExpression" &&
    obj.callee.property?.type === "Identifier" &&
    EXPENSIVE_METHODS.has(obj.callee.property.name)
  ) {
    return true;
  }

  return false;
};

export const noExpensiveInlineExpression: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow chained array methods (filter/map/reduce/sort) in template expressions",
    },
    messages: {
      noExpensiveInline:
        "Chained array operations in templates re-run on every render. Extract to a computed property.",
    },
    schema: [],
  },
  create(context) {
    const services = (context.sourceCode as any).parserServices;
    if (!services?.defineTemplateBodyVisitor) return {};

    return services.defineTemplateBodyVisitor({
      CallExpression(node: any) {
        if (checkChainedCalls(node)) {
          context.report({ node, messageId: "noExpensiveInline" });
        }
      },
    });
  },
};
