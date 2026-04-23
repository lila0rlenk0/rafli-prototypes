// -- Positional booleans hide intent at call sites (foo(x, true)). Use an
// options object with a named boolean (e.g. { shouldRetry: true }).

function hasBooleanParam(fnNode) {
  for (const p of fnNode.params) {
    if (p.type === "RestElement") break;
    let pat = p;
    if (p.type === "AssignmentPattern") pat = p.left;
    if (pat.type !== "Identifier") continue;
    const ann = pat.typeAnnotation;
    if (!ann || ann.type !== "TSTypeAnnotation") continue;
    if (ann.typeAnnotation.type === "TSBooleanKeyword") return true;
  }
  return false;
}

function isTopLevelFunctionExpression(node) {
  if (
    node.type !== "FunctionExpression" &&
    node.type !== "ArrowFunctionExpression"
  ) {
    return false;
  }
  const decl = node.parent;
  if (decl?.type !== "VariableDeclarator" || decl.init !== node) return false;
  const vd = decl.parent;
  if (vd?.type !== "VariableDeclaration") return false;
  const gp = vd.parent;
  return gp?.type === "Program" || gp?.type === "ExportNamedDeclaration";
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow positional boolean parameters — use a named options object.",
    },
    messages: {
      flag: "Positional boolean parameter — use an options object with an intention-revealing name (e.g. { isOpen: boolean }).",
    },
    schema: [],
  },
  create(context) {
    function check(fnNode) {
      if (!hasBooleanParam(fnNode)) return;
      context.report({ node: fnNode, messageId: "flag" });
    }
    return {
      FunctionDeclaration: check,
      MethodDefinition(node) {
        const v = node.value;
        if (
          v &&
          (v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression")
        ) {
          check(v);
        }
      },
      FunctionExpression(node) {
        if (isTopLevelFunctionExpression(node)) check(node);
      },
      ArrowFunctionExpression(node) {
        if (isTopLevelFunctionExpression(node)) check(node);
      },
    };
  },
};
