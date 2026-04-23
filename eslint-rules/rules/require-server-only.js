// -- require `import "server-only"` at the top of every src/lib/api/ server
// client file.
//
// why: src/lib/api/ holds the typed HTTP clients that talk to the Raffly
// backend. baseClient/authenticatedClient carry the S2S secret and the
// Bearer JWT from the httpOnly `raffly-token` cookie — if a client
// component pulled them into the browser bundle, those secrets would leak
// on every page load. the `server-only` package throws at build time if
// it's ever imported into a client graph, which is the exact safety net
// we want.
//
// scope: src/lib/api/**, excluding `browser-client.ts` which is
// intentionally browser-only (OAuth redirect flows).

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require `import \"server-only\"` in src/lib/api/** (except browser-client.ts) so client imports fail at build time.",
    },
    messages: {
      missing:
        'src/lib/api/ files must import "server-only" at the top. Add: import "server-only"; as the first import.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!filename.includes("/src/lib/api/")) return {};
    // -- browser-only OAuth client is exempt by design
    if (filename.endsWith("/browser-client.ts")) return {};

    return {
      Program(node) {
        const hasServerOnly = node.body.some(
          (stmt) =>
            stmt.type === "ImportDeclaration" &&
            stmt.source.value === "server-only" &&
            stmt.specifiers.length === 0
        );
        if (!hasServerOnly) {
          context.report({ node, messageId: "missing" });
        }
      },
    };
  },
};
