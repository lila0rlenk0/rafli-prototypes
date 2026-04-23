// -- testing.md: "No snapshot tests — they break on every change and teach
// nothing." explicit assertions force the author to name the contract;
// snapshots accept whatever the implementation produces, then auto-approve
// drift on the next `-u` run. behavior tests stay green only when the
// claimed behavior still holds.
const BANNED = new Set([
  "toMatchSnapshot",
  "toMatchInlineSnapshot",
  "toMatchFileSnapshot",
  "toThrowErrorMatchingSnapshot",
  "toThrowErrorMatchingInlineSnapshot",
]);

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow snapshot assertions — assert behavior explicitly (.claude/rules/testing.md).",
    },
    messages: {
      snap: "`{{ matcher }}` is forbidden. Assert the observable behavior explicitly (.claude/rules/testing.md).",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.property.type !== "Identifier"
        ) {
          return;
        }
        if (!BANNED.has(callee.property.name)) return;
        context.report({
          node,
          messageId: "snap",
          data: { matcher: callee.property.name },
        });
      },
    };
  },
};
