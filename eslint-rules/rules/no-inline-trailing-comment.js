// -- comments.md: "keep comments on the line above the code they describe,
// not inline (except short flags)". trailing `code // text` comments drift
// out of sync with the code they annotate, wrap awkwardly after formatting,
// and visually compete with the expression — the file-above pattern reads
// top-down and survives refactors.
//
// short-flag exceptions are tool pragmas that MUST sit inline to bind to
// their line: eslint/prettier/ts directives and TypeScript triple-slash
// references. everything else belongs on the preceding line.
const PRAGMA_PREFIXES = [
  "eslint-",
  "ts-",
  "prettier-",
  "@ts-",
  "<reference",
  "istanbul",
  "c8",
  "v8",
];

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow trailing inline comments on code lines — see .claude/rules/comments.md.",
    },
    messages: {
      trailing:
        "Move this comment to the line above the code it describes. Inline trailing comments are forbidden by .claude/rules/comments.md (short-flag pragmas excepted).",
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type !== "Line") continue;

          const line = sourceCode.lines[comment.loc.start.line - 1] ?? "";
          const before = line.slice(0, comment.loc.start.column);
          if (!/\S/.test(before)) continue;

          const body = comment.value.trim();
          if (PRAGMA_PREFIXES.some((p) => body.startsWith(p))) continue;

          context.report({ node: comment, messageId: "trailing" });
        }
      },
    };
  },
};
