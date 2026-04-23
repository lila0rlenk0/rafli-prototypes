// -- code-style.md: "Dead code gets deleted. No commented-out JSX. Git is
// the archive." commented-out code rots — the syntax drifts, the imports
// vanish, and reviewers have to divine whether the block still works. if
// you might want it back, git reflog has it; delete now, restore later.
//
// the rule targets the high-signal case: TS/JS statement comments whose
// body opens with a declaration keyword AND ends with terminating
// punctuation. prose about JSX is unavoidable in narration ("renders the
// <Card> wrapper"), so we deliberately do NOT flag JSX-shaped comments —
// otherwise every third component docblock lights up. commented-out JSX
// blocks remain a reviewer-caught issue.
const STATEMENT_STARTS =
  /^(return |const |let |var |import |export |function |class |await |async |if \(|for \(|while \(|throw new |throw )/;

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow commented-out code (JSX tags, TS statements). See .claude/rules/code-style.md.",
    },
    messages: {
      dead: "Commented-out code detected. Delete it — git is the archive (.claude/rules/code-style.md).",
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type !== "Line") continue;
          const body = comment.value.trim();
          if (!body) continue;

          // -- `// --` is reserved for section/block headers — narration, not
          // disabled code, even if they contain `<...>` in the prose.
          if (body.startsWith("--")) continue;

          if (STATEMENT_STARTS.test(body) && /[;})]$/.test(body)) {
            context.report({ node: comment, messageId: "dead" });
          }
        }
      },
    };
  },
};
