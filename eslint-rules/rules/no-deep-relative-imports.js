// -- disallow relative imports that cross more than one directory level
// forces use of @/ alias for cross-directory imports, improving readability
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow relative imports deeper than one level (../../)",
    },
    messages: {
      deepRelative:
        'Import "{{ source }}" crosses multiple directories. Use the @/ alias instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (source.startsWith("../../")) {
          context.report({
            node: node.source,
            messageId: "deepRelative",
            data: { source },
          });
        }
      },
    };
  },
};
