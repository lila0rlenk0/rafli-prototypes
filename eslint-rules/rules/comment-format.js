// -- enforce the line-comment shape mandated by .claude/rules/comments.md:
// exactly one space after `//`, no double-space indent, no `//foo` run-on.
// block-level section comments (`// --`) still pass — `--` is after the
// required space. empty `//`, triple-slash directives (`///`), and the
// shebang exception (files that open with `#!`) are left alone because
// they carry tool meaning rather than prose.
export default {
  meta: {
    type: "layout",
    fixable: "whitespace",
    docs: {
      description:
        "Require a single space after `//` on line comments (see .claude/rules/comments.md).",
    },
    messages: {
      missingSpace:
        'Line comment must have one space after "//". Got "//{{ raw }}".',
      doubleSpace:
        'Line comment has extra spaces after "//" — use a single space. Got "//{{ raw }}".',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        const comments = sourceCode.getAllComments();
        const lineCommentLines = new Set();
        for (const c of comments) {
          if (c.type === "Line") lineCommentLines.add(c.loc.start.line);
        }

        for (const comment of comments) {
          if (comment.type !== "Line") continue;
          const raw = comment.value;
          if (raw === "") continue;
          // -- `///` triple-slash directive: leave alone
          if (raw.startsWith("/")) continue;

          const preview = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw;
          const isContinuation = lineCommentLines.has(
            comment.loc.start.line - 1,
          );

          if (!raw.startsWith(" ")) {
            context.report({
              node: comment,
              messageId: "missingSpace",
              data: { raw: preview },
              fix(fixer) {
                const insertAt = comment.range[0] + 2;
                return fixer.insertTextBeforeRange(
                  [insertAt, insertAt],
                  " ",
                );
              },
            });
            continue;
          }

          // -- only enforce the single-space rule on the FIRST line of a
          // comment block. continuation lines may indent freely.
          if (!isContinuation && raw.startsWith("  ")) {
            context.report({
              node: comment,
              messageId: "doubleSpace",
              data: { raw: preview },
              fix(fixer) {
                const leading = raw.match(/^ +/)[0].length;
                const start = comment.range[0] + 2;
                return fixer.replaceTextRange(
                  [start, start + leading],
                  " ",
                );
              },
            });
          }
        }
      },
    };
  },
};
