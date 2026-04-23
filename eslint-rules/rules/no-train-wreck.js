// -- Law of Demeter: chains like a.b.c.d.e hide collaborators. Bind locals.

const ROOT_ALLOW = new Set(["process", "Intl", "console", "Math", "JSON", "window", "document"]);

function chainDepth(node) {
  let d = 0;
  let cur = node;
  while (cur && (cur.type === "MemberExpression" || cur.type === "OptionalMemberExpression")) {
    d += 1;
    cur = cur.object;
  }
  return d;
}

function chainRoot(node) {
  let cur = node;
  while (cur && (cur.type === "MemberExpression" || cur.type === "OptionalMemberExpression")) {
    cur = cur.object;
  }
  return cur;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow member chains deeper than three property accesses (train wrecks).",
    },
    messages: {
      wreck: "Chain of {{ depth }}+ property accesses — extract intermediate locals or hide behind a method.",
    },
    schema: [],
  },
  create(context) {
    return {
      "MemberExpression, OptionalMemberExpression"(node) {
        if (node.parent.type === "MemberExpression" || node.parent.type === "OptionalMemberExpression") {
          return;
        }
        const depth = chainDepth(node);
        if (depth < 4) return;
        const root = chainRoot(node);
        if (root.type === "Identifier" && ROOT_ALLOW.has(root.name)) return;
        if (root.type === "ThisExpression" || root.type === "Super") return;
        context.report({ node, messageId: "wreck", data: { depth: String(depth) } });
      },
    };
  },
};
