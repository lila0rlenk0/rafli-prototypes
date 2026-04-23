// -- testing.md + e2e: "No `test.only` / uncommented `test.skip` in committed
// code." `.only` silently narrows CI to one test, masking every other
// regression; `.skip` parks work in a state that drifts until nobody
// remembers whether the spec still describes the truth. land whole or
// delete — never commit a partial suite.
const RUNNERS = new Set(["test", "it", "describe"]);
const BANNED = new Set(["only", "skip"]);

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `.only` / `.skip` on test runners in committed code (.claude/rules/testing.md).",
    },
    messages: {
      forbid:
        "`{{ expr }}` is forbidden in committed code. Remove the modifier before shipping (.claude/rules/testing.md).",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          RUNNERS.has(node.object.name) &&
          node.property.type === "Identifier" &&
          BANNED.has(node.property.name)
        ) {
          context.report({
            node,
            messageId: "forbid",
            data: { expr: `${node.object.name}.${node.property.name}` },
          });
        }
      },
    };
  },
};
