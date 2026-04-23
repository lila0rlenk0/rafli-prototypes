// -- Complements no-else-return: else { throw } can become a guard clause.

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow else blocks that only throw — invert condition and guard-clause instead.",
    },
    messages: {
      elseThrow: "Else only throws — use `if (!cond) throw …` then the happy path (no else).",
    },
    schema: [],
  },
  create(context) {
    return {
      IfStatement(node) {
        if (!node.alternate) return;
        if (node.alternate.type !== "BlockStatement") return;
        const body = node.alternate.body;
        if (body.length !== 1) return;
        if (body[0].type !== "ThrowStatement") return;
        context.report({ node: node.alternate, messageId: "elseThrow" });
      },
    };
  },
};
