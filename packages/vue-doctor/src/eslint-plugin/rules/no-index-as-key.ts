import type { Rule } from "eslint";

export const noIndexAsKey: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow using v-for index as :key, which causes rendering issues",
    },
    messages: {
      noIndexKey:
        "Avoid using v-for index as :key — it causes incorrect DOM reuse when list order changes. Use a unique identifier instead.",
    },
    schema: [],
  },
  create(context) {
    const services = (context.sourceCode as any).parserServices;
    if (!services?.defineTemplateBodyVisitor) return {};

    return services.defineTemplateBodyVisitor({
      VForExpression(node: any) {
        const parent = node.parent;
        if (!parent || parent.type !== "VExpressionContainer") return;

        const directive = parent.parent;
        if (!directive || directive.type !== "VAttribute") return;

        const element = directive.parent?.parent;
        if (!element || element.type !== "VElement") return;

        const indexVar = node.left.length >= 2 ? node.left[1] : null;
        if (!indexVar) return;

        const indexName = indexVar.type === "Identifier" ? indexVar.name : null;
        if (!indexName) return;

        for (const attr of element.startTag?.attributes ?? []) {
          if (
            attr.directive &&
            attr.key?.name?.name === "bind" &&
            attr.key?.argument?.name === "key" &&
            attr.value?.expression?.type === "Identifier" &&
            attr.value.expression.name === indexName
          ) {
            context.report({ node: attr, messageId: "noIndexKey" });
          }
        }
      },
    });
  },
};
