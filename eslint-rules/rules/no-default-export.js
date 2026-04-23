// -- disallow default exports in favor of named exports
// exception: App Router files (page, layout, loading, error, not-found) require default exports
// this rule is turned off for those files in eslint.config.mjs
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow default exports — use named exports for better refactoring",
    },
    messages: {
      noDefault:
        "Use named exports instead of default export. Default exports are only allowed in App Router files (page, layout, loading, error, not-found).",
    },
    schema: [],
  },
  create(context) {
    return {
      ExportDefaultDeclaration(node) {
        context.report({ node, messageId: "noDefault" });
      },
      ExportNamedDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (
            specifier.exported &&
            specifier.exported.type === "Identifier" &&
            specifier.exported.name === "default"
          ) {
            context.report({ node: specifier, messageId: "noDefault" });
          }
        }
      },
    };
  },
};
