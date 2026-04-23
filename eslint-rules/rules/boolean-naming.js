// -- enforce is/has/can/should/will/was/did prefix for boolean variables
// makes intent clear: isLoading, hasPermission, canEdit — not loading, permission, edit

const BOOLEAN_PREFIXES = /^(is|has|can|should|will|was|did|does)[A-Z]/;

// -- single-word booleans that are self-evident and allowed without prefix
const ALLOWED_NAMES = new Set([
  "ok",
  "done",
  "valid",
  "found",
  "ready",
  "empty",
  "open",
  "closed",
  "visible",
  "hidden",
  "mounted",
  "enabled",
  "disabled",
  "loading",
  "loaded",
  "pending",
  "active",
  "checked",
  "selected",
  "focused",
  "collapsed",
  "expanded",
  "required",
  "optional",
  "readonly",
  "muted",
  "paused",
  "locked",
  "authenticated",
  "authorized",
]);

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce is/has/can prefix for boolean variable declarations",
    },
    messages: {
      missingPrefix:
        'Boolean variable "{{ name }}" should be prefixed with is/has/can/should/will/was/did (e.g., "{{ suggestion }}").',
    },
    schema: [],
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (!node.id || node.id.type !== "Identifier") return;
        if (!node.id.typeAnnotation) return;

        const annotation = node.id.typeAnnotation;
        const typeNode =
          annotation.type === "TSTypeAnnotation"
            ? annotation.typeAnnotation
            : annotation;

        if (typeNode.type !== "TSBooleanKeyword") return;

        const name = node.id.name;
        if (BOOLEAN_PREFIXES.test(name)) return;
        if (ALLOWED_NAMES.has(name)) return;
        if (name.startsWith("_")) return;

        const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
        const suggestion = `is${capitalized}`;

        context.report({
          node: node.id,
          messageId: "missingPrefix",
          data: { name, suggestion },
        });
      },
    };
  },
};
