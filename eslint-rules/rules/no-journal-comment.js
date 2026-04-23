// -- Journal / ownership comments rot (dates, @author, NOTE:). Git history is the journal.

const PATTERNS = [
  /\d{4}-\d{2}-\d{2}/u,
  /@author\b/iu,
  /^\s*NOTE:\s/iu,
  /^\s*CHANGELOG:\s/iu,
];

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow dated journal, @author, NOTE:/CHANGELOG: line comments.",
    },
    messages: {
      journal: "Journal-style comment — delete or replace with code / a why-only comment.",
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
          if (!body || body.startsWith("--")) continue;
          if (PATTERNS.some((re) => re.test(body))) {
            context.report({ node: comment, messageId: "journal" });
          }
        }
      },
    };
  },
};
