// -- tailwind-css skill: "Do NOT use `cn` for static strings in className
// attributes: className="fixed classes"." wrapping a single literal in
// `cn()` adds tailwind-merge + clsx work at render time for zero benefit
// because there are no conflicts to resolve and no conditionals to fold.
//
// the rule fires on exactly two shapes that compile to the same thing
// as the raw string:
//   cn('one static string')
//   cn(\`template literal with no ${expressions}\`)
// anything with ≥2 args, conditionals, or interpolations is a legitimate
// `cn()` use and is left alone. flags both call expressions and the value
// passed as a `className={cn(...)}` attribute — shadcn primitives are the
// typical offender and they flow through both shapes.

function isStaticString(node) {
  if (!node) return false;
  if (node.type === "Literal" && typeof node.value === "string") return true;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return true;
  }
  return false;
}

// -- `cn()` is imported from '@/lib/class-names' (or the shadcn-local
// `@/lib/utils`). both names collapse to the same helper — match either
// so the rule survives a future rename.
function isCnCall(node) {
  if (!node || node.type !== "CallExpression") return false;
  if (node.callee.type !== "Identifier") return false;
  return node.callee.name === "cn";
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `cn()` with a single static string argument — use the raw string.",
    },
    messages: {
      staticOnly:
        "`cn()` wrapping a single static string is pointless — drop the call and use the literal directly (tailwind-css skill).",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isCnCall(node)) return;
        if (node.arguments.length !== 1) return;
        if (!isStaticString(node.arguments[0])) return;
        context.report({ node, messageId: "staticOnly" });
      },
    };
  },
};
