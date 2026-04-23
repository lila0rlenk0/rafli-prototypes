// -- forbid unencoded `${...}` interpolation inside axios/fetch URL strings
//
// why: every service action accepts user-controlled identifiers (raffleId,
// messageId, usernameOrId, promo codes, …). Interpolating them raw into
// backend URLs turns each call into a path-traversal / parameter-injection
// vector on any backend that doesn't normalize RFC 3986 dot-segments. The
// sanctioned wrappers are `pathParam()` (re-exported from
// @/lib/utils/path-param) and `encodeURIComponent()`.
//
// This rule flags template literals whose first character is a `/` (i.e.
// an HTTP path) and that contain at least one `${…}` whose expression
// isn't already a call to one of those two sanctioned encoders. It is
// intentionally conservative — callers that need a raw segment can use a
// comment disable line so the security review stays explicit.

const ENCODER_NAMES = new Set(["pathParam", "encodeURIComponent"]);

function isSanctionedEncoder(expression) {
  if (!expression || expression.type !== "CallExpression") return false;
  const callee = expression.callee;
  if (callee.type === "Identifier") {
    return ENCODER_NAMES.has(callee.name);
  }
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return ENCODER_NAMES.has(callee.property.name);
  }
  return false;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require pathParam() or encodeURIComponent() when interpolating values into URL paths (.claude/rules/services.md security).",
    },
    messages: {
      unencoded:
        "URL path interpolation `${{expression}}` must be wrapped in pathParam() to prevent path traversal. Import pathParam from '@/lib/utils/path-param'.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // Lint enforcement is scoped to service actions and the API client.
    // Elsewhere (e.g. revalidatePath targets, test fixtures) the same
    // pattern is either not a live URL or already trusted.
    if (!filename.includes("/src/services/") && !filename.includes("/src/lib/api/")) {
      return {};
    }
    return {
      TemplateLiteral(node) {
        const firstQuasi = node.quasis[0];
        if (!firstQuasi || typeof firstQuasi.value.cooked !== "string") return;
        // Only flag URL-shaped templates — anything starting with "/"
        // is an HTTP path in this file set.
        if (!firstQuasi.value.cooked.startsWith("/")) return;
        for (const expression of node.expressions) {
          if (!isSanctionedEncoder(expression)) {
            context.report({
              node: expression,
              messageId: "unencoded",
              data: { expression: context.sourceCode.getText(expression) },
            });
          }
        }
      },
    };
  },
};
