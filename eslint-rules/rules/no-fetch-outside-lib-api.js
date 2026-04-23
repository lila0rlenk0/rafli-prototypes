// -- block direct `fetch()` calls outside src/lib/api/
//
// why: `data-fetching.md` + `services.md` say all HTTP goes through
// src/lib/api/. a raw fetch() in a feature component, service, or page
// would bypass the typed client, auth header injection, S2S secret,
// Bearer JWT forwarding, error shape normalization, and Next.js cache
// tags. every known correct call site lives in src/lib/api/ (baseClient,
// authenticatedClient, browserClient).
//
// allowed locations:
//   - src/lib/api/**     — the typed client implementation itself
//   - eslint-rules/**    — meta tooling (not in the production bundle)

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct fetch() calls outside src/lib/api/. Route all HTTP through the typed client.",
    },
    messages: {
      noFetch:
        "Direct fetch() is forbidden outside src/lib/api/. Import a helper from @/lib/api/ or add the endpoint there (.claude/rules/services.md).",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (
      filename.includes("/src/lib/api/") ||
      filename.includes("/eslint-rules/")
    ) {
      return {};
    }
    return {
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "fetch") {
          context.report({ node, messageId: "noFetch" });
        }
      },
    };
  },
};
