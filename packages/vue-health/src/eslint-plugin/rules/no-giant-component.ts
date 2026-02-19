import type { Rule } from "eslint";

const DEFAULT_THRESHOLD = 300;

export const noGiantComponent: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow Vue SFC script blocks exceeding a line threshold",
    },
    messages: {
      tooLarge:
        "Script block has {{ lines }} lines (threshold: {{ threshold }}). Consider splitting into smaller composables or components.",
    },
    schema: [
      {
        type: "object",
        properties: {
          threshold: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const threshold = context.options[0]?.threshold ?? DEFAULT_THRESHOLD;

    return {
      Program(node: any) {
        // In vue-eslint-parser, the Program node for .vue files has templateBody
        // and the script content is in the body
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const text = sourceCode.getText(node);
        const lines = text.split("\n").length;

        if (lines > threshold) {
          context.report({
            node,
            messageId: "tooLarge",
            data: {
              lines: String(lines),
              threshold: String(threshold),
            },
          });
        }
      },
    };
  },
};
