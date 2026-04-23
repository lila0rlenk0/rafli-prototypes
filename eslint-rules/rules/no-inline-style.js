// -- disallow inline style={{}} prop on JSX elements
// Tailwind CSS covers all layout and theming — inline styles bypass the design
// system. DESIGN.md: "Don't use inline style={} for anything Tailwind can express."
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow inline style prop — use Tailwind CSS utilities instead",
    },
    messages: {
      noInlineStyle:
        "Inline style={{}} is not allowed. Use Tailwind CSS utility classes instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "style") return;

        // -- allow style prop with CSS variable objects (used by shadcn/ui Sonner)
        // only flag object literals, not spread/variable references
        if (
          node.value &&
          node.value.type === "JSXExpressionContainer" &&
          node.value.expression.type === "ObjectExpression"
        ) {
          context.report({ node, messageId: "noInlineStyle" });
        }

        if (node.value && node.value.type === "Literal") {
          context.report({ node, messageId: "noInlineStyle" });
        }
      },
    };
  },
};
