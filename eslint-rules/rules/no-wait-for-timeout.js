// -- e2e: "`page.waitForTimeout` — wait on locators, URLs, or API responses."
// arbitrary sleeps paper over races that will one day land on CI's slowest
// runner and go red with no useful signal. wait on the thing the test
// actually cares about (`locator.waitFor`, `waitForURL`, `waitForResponse`)
// and the failure mode becomes legible.
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `waitForTimeout` — wait on a locator, URL, or API response.",
    },
    messages: {
      timeout:
        "`waitForTimeout` is forbidden. Wait on a locator, URL, or network response instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "waitForTimeout"
        ) {
          context.report({ node, messageId: "timeout" });
        }
      },
    };
  },
};
