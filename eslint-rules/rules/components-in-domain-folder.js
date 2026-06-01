// -- every file under src/components/ must live in a domain subfolder.
// flat top-level files are forbidden — they bypass the domain grouping
// that mirrors the src/services/<domain>/ structure and eventually
// re-creates the soup this layout was introduced to kill.
//
// `ui/` is shadcn-managed (stock primitives) and out of scope. to add a
// new domain, edit ALLOWED_DOMAINS below and reference .claude/rules/
// architecture.md.
const ALLOWED_DOMAINS = new Set([
  "admin",
  "auth",
  "browse",
  "compliance",
  "filters",
  "fulfillment",
  "host",
  "hub",
  "landing",
  "messages",
  "mode",
  "my-raffles",
  "notifications",
  "order",
  "payment",
  "pricing",
  "profile",
  "promo-code",
  "raffle",
  "report",
  "subscribe",
  "ui",
  "ui-custom",
  "verification",
]);

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Components must live in a domain subfolder of src/components/",
    },
    messages: {
      flatFile:
        'File "{{ rel }}" is at the top level of src/components/. Move it into one of: {{ domains }}.',
      unknownDomain:
        'Folder "{{ domain }}" is not an approved components domain. Use one of: {{ domains }}, or propose a new domain in .claude/rules/architecture.md before adding it.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename ?? context.getFilename();
        const idx = filename.indexOf("/src/components/");
        if (idx === -1) return;
        const rel = filename.slice(idx + "/src/components/".length);
        const parts = rel.split("/");
        if (parts.length < 2) {
          context.report({
            node,
            messageId: "flatFile",
            data: {
              rel,
              domains: [...ALLOWED_DOMAINS].sort().join(", "),
            },
          });
          return;
        }
        const domain = parts[0];
        if (!ALLOWED_DOMAINS.has(domain)) {
          context.report({
            node,
            messageId: "unknownDomain",
            data: {
              domain,
              domains: [...ALLOWED_DOMAINS].sort().join(", "),
            },
          });
        }
      },
    };
  },
};
