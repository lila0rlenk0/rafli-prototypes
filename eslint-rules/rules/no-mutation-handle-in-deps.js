// -- TanStack Query's useMutation / useQuery returns a NEW object reference on
// every render (state-tracking fields like isPending mutate per render).
// Putting the whole handle in a useEffect/useMemo/useCallback deps array
// re-fires the hook on every render and storms downstream effects (WS sends,
// fetches, etc.). Destructure stable members instead: `const { mutate } = ...`.
//
// Real prod incident — 2026-04-28: `mark_read` WS storm, ~150 frames/min from
// one user, traced to a custom `useMarkConversationRead()` wrapper handle in
// deps. Custom wrappers (`use*Mutation`, `use*Query`, `use*Read`, etc.) defeat
// a name-based heuristic, so this rule keys off TanStack's *result shape* —
// `.mutate(`, `.mutateAsync(`, `.refetch(`, `.data`, `.isPending`, etc. — to
// identify a binding as a query/mutation handle regardless of the hook's name.

const HOOK_NAMES = new Set(["useEffect", "useMemo", "useCallback"]);

// TanStack handle markers — if a binding is accessed by any of these member
// names, treat it as a query/mutation result.
const HANDLE_MEMBERS = new Set([
  "mutate",
  "mutateAsync",
  "refetch",
  "isPending",
  "isLoading",
  "isFetching",
  "fetchNextPage",
  "fetchPreviousPage",
]);

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow useMutation/useQuery result handles in useEffect/useMemo/useCallback deps. Destructure stable fields (`mutate`, `data`, `refetch`) instead.",
    },
    messages: {
      handleInDeps:
        "`{{name}}` is a TanStack Query result handle (its reference changes every render). Destructure stable fields (`{ mutate }` / `{ data }` / `{ refetch }`) and depend on those.",
    },
    schema: [],
  },
  create(context) {
    // candidate name -> { declNode, declarator, isHandle }
    // We scan VariableDeclarators whose init is a CallExpression starting with `use*`,
    // then post-confirm by looking for a TanStack member-access of that binding.
    const candidates = new Map();
    // Track deps array sites to re-check after we've finished scanning members.
    const pendingDepsChecks = [];

    // Hook-call detection. Returns:
    //   null if not a use* hook
    //   "namePattern" if name strongly implies query/mutation (auto-confirm)
    //   "shape" if name doesn't imply, requires shape post-confirmation
    function classifyUseHookCall(node) {
      if (!node || node.type !== "CallExpression") return null;
      const callee = node.callee;
      let name = null;
      if (callee.type === "Identifier") name = callee.name;
      else if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier"
      )
        name = callee.property.name;
      if (!name || !/^use[A-Z0-9]/.test(name)) return null;
      if (/(Mutation|Query)$/.test(name)) return "namePattern";
      return "shape";
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const cls = classifyUseHookCall(node.init);
        if (!cls) return;
        candidates.set(node.id.name, { isHandle: cls === "namePattern" });
      },

      MemberExpression(node) {
        if (node.object.type !== "Identifier") return;
        const cand = candidates.get(node.object.name);
        if (!cand) return;
        if (node.property.type !== "Identifier") return;
        if (HANDLE_MEMBERS.has(node.property.name)) {
          cand.isHandle = true;
        }
      },

      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;
        if (!HOOK_NAMES.has(node.callee.name)) return;
        const deps = node.arguments[node.arguments.length - 1];
        if (!deps || deps.type !== "ArrayExpression") return;
        // Defer evaluation until we've finished collecting member-accesses;
        // without this, an effect declared *before* a downstream `.mutate(`
        // call would miss the confirmation.
        for (const el of deps.elements) {
          if (!el || el.type !== "Identifier") continue;
          pendingDepsChecks.push({ identifier: el });
        }
      },

      "Program:exit"() {
        for (const { identifier } of pendingDepsChecks) {
          const cand = candidates.get(identifier.name);
          if (cand && cand.isHandle) {
            context.report({
              node: identifier,
              messageId: "handleInDeps",
              data: { name: identifier.name },
            });
          }
        }
      },
    };
  },
};
