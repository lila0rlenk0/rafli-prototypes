// -- data-fetching.md + react-effects.md: "Never use `useEffect` for data —
// RSC fetches in pages, server actions handle mutations." useEffect-based
// data loading reintroduces client waterfalls, skips revalidate semantics,
// and cannot be canceled cleanly on unmount without boilerplate. anything
// that talks to the backend belongs in a server component (via lib/api/) or
// a server action in src/services/ (which calls lib/api/).
//
// the rule flags `useEffect(() => { ... fetch(...) ... })` and any effect
// body that calls into a binding imported from `@/lib/api/*` or
// `@/services/*`. legitimate client-side effects (media queries, DOM
// listeners, Blob downloads) are untouched.
function walkFindApiCall(root, apiLocals) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (node.type === "CallExpression") {
      const callee = node.callee;
      if (callee.type === "Identifier") {
        if (callee.name === "fetch" || apiLocals.has(callee.name)) return node;
      }
      if (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        apiLocals.has(callee.object.name)
      ) {
        return node;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "range" || key === "parent") continue;
      const v = node[key];
      if (Array.isArray(v)) for (const c of v) stack.push(c);
      else if (v && typeof v === "object" && typeof v.type === "string") stack.push(v);
    }
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow data fetching inside useEffect — fetch in RSC via lib/api/ or via a server action (.claude/rules/data-fetching.md).",
    },
    messages: {
      fetchIn:
        "useEffect must not call `fetch`, any `@/lib/api/*`, or `@/services/*` binding. Fetch in an async RSC page, or trigger a server action (.claude/rules/data-fetching.md).",
    },
    schema: [],
  },
  create(context) {
    const apiLocals = new Set();
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (
          !source.startsWith("@/lib/api") &&
          !source.startsWith("@/services")
        ) {
          return;
        }
        for (const spec of node.specifiers) {
          apiLocals.add(spec.local.name);
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "useEffect") {
          return;
        }
        const effectFn = node.arguments[0];
        if (!effectFn || !effectFn.body) return;

        const hit = walkFindApiCall(effectFn.body, apiLocals);
        if (hit) context.report({ node: hit, messageId: "fetchIn" });
      },
    };
  },
};
