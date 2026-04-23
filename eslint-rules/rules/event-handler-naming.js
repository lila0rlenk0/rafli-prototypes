// -- enforce the naming split from .claude/rules/code-style.md:
// `on*` is reserved for component props (the JSX-facing name); the local
// function wired to that prop uses `handle*`. e.g.
//   <Button onClick={handleSubmit}>   ✔
//   const onSubmit = () => {}          ✖ → handleSubmit
//   interface FooProps { handleX: … } ✖ → onX
// the rule runs both directions so drift is caught wherever it appears.

function hasPrefix(name, prefix) {
  if (!name.startsWith(prefix)) return false;
  const next = name.charAt(prefix.length);
  return next >= "A" && next <= "Z";
}

function swapPrefix(name, from, to) {
  return to + name.slice(from.length);
}

function isHandlerValue(node) {
  if (!node) return false;
  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression"
  ) {
    return true;
  }
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    (node.callee.name === "useCallback" || node.callee.name === "useEvent")
  ) {
    return true;
  }
  return false;
}

function findEnclosingPropsName(node) {
  let parent = node.parent;
  while (parent) {
    if (
      (parent.type === "TSInterfaceDeclaration" ||
        parent.type === "TSTypeAliasDeclaration") &&
      parent.id &&
      parent.id.name &&
      parent.id.name.endsWith("Props")
    ) {
      return parent.id.name;
    }
    parent = parent.parent;
  }
  return null;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce `handle*` for local handlers and `on*` for component prop types.",
    },
    messages: {
      localShouldHandle:
        'Local handler "{{ name }}" should be renamed "{{ suggestion }}" — reserve `on*` for JSX prop names.',
      propShouldOn:
        'Prop "{{ name }}" on {{ propsName }} should be renamed "{{ suggestion }}" — `handle*` is for internal handlers, `on*` is the prop contract.',
    },
    schema: [],
  },
  create(context) {
    let fnDepth = 0;
    return {
      ":function"() {
        fnDepth += 1;
      },
      ":function:exit"() {
        fnDepth -= 1;
      },
      VariableDeclarator(node) {
        if (fnDepth === 0) return;
        if (!node.id || node.id.type !== "Identifier") return;
        const name = node.id.name;
        if (!hasPrefix(name, "on")) return;
        if (!isHandlerValue(node.init)) return;
        context.report({
          node: node.id,
          messageId: "localShouldHandle",
          data: { name, suggestion: swapPrefix(name, "on", "handle") },
        });
      },
      TSPropertySignature(node) {
        if (!node.key || node.key.type !== "Identifier") return;
        const name = node.key.name;
        if (!hasPrefix(name, "handle")) return;
        const propsName = findEnclosingPropsName(node);
        if (!propsName) return;
        context.report({
          node: node.key,
          messageId: "propShouldOn",
          data: {
            name,
            propsName,
            suggestion: swapPrefix(name, "handle", "on"),
          },
        });
      },
    };
  },
};
