// -- enforce kebab-case file naming across the codebase
// allows Next.js App Router special files (page, layout, loading, error, etc.)
import path from "node:path";

// -- pattern: lowercase letters and digits separated by single hyphens
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// -- Next.js App Router files that must use specific names
const ALLOWED_NAMES = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "not-found",
  "default",
  "route",
  "middleware",
  "globals",
  "global-error",
  "next-env.d",
]);

export default {
  meta: {
    type: "suggestion",
    docs: { description: "Enforce kebab-case file naming" },
    messages: {
      notKebabCase:
        'Filename "{{ name }}" is not kebab-case. Rename to "{{ suggestion }}".',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename;
        if (!filename || filename === "<input>" || filename === "<text>")
          return;

        const basename = path.basename(filename);
        // -- extract name before first dot: "raffle-card.test.tsx" -> "raffle-card"
        const name = basename.split(".")[0];

        if (ALLOWED_NAMES.has(name)) return;

        // -- skip files starting with "[" (Next.js dynamic segments aren't filenames)
        if (name.startsWith("[")) return;

        if (!KEBAB_CASE.test(name)) {
          const suggestion = name
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
            .replace(/_/g, "-")
            .toLowerCase();

          context.report({
            node,
            messageId: "notKebabCase",
            data: { name: basename, suggestion: suggestion + basename.slice(name.length) },
          });
        }
      },
    };
  },
};
