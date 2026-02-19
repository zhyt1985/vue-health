import type { Rule } from "eslint";

// Patterns that indicate secrets/credentials
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*["'`][A-Za-z0-9_\-]{16,}/i,
  /(?:secret|token|password|passwd|pwd)\s*[:=]\s*["'`][A-Za-z0-9_\-/.+]{8,}/i,
  /(?:access[_-]?key|private[_-]?key)\s*[:=]\s*["'`][A-Za-z0-9_\-/.+]{16,}/i,
  /\bsk[-_](?:live|test)[-_][A-Za-z0-9]{20,}/,  // Stripe
  /\bAIza[A-Za-z0-9_\\-]{35}/,                   // Google API
  /\bghp_[A-Za-z0-9]{36}/,                       // GitHub PAT
  /\bnpm_[A-Za-z0-9]{36}/,                       // npm token
];

export const noSecretsInClient: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow hardcoded API keys, tokens, and secrets in client-side code",
    },
    messages: {
      noSecret:
        "Possible hardcoded secret detected. Use environment variables (e.g. import.meta.env.VITE_*) instead.",
    },
    schema: [],
  },
  create(context) {
    const checkLiteral = (node: any) => {
      if (typeof node.value !== "string" || node.value.length < 8) return;
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(node.value)) {
          context.report({ node, messageId: "noSecret" });
          return;
        }
      }
    };

    return {
      Literal: checkLiteral,
      TemplateLiteral(node: any) {
        for (const quasi of node.quasis) {
          if (typeof quasi.value?.raw !== "string") continue;
          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(quasi.value.raw)) {
              context.report({ node, messageId: "noSecret" });
              return;
            }
          }
        }
      },
    };
  },
};
