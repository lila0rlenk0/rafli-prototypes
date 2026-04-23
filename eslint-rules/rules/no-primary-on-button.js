// -- DESIGN.md: "`--primary` resolves to cyan `#00b8ff` and is used for
// links, progress fills, and selection states only. Buttons, notification
// badges (unread chips, counter pills, default Badge fill), and any
// high-emphasis action surface use `rafli-black` (#141416) — never cyan."
//
// the rule flags `bg-primary` (and the raw hex `bg-[#00b8ff]`) when applied
// to a `<button>` or shadcn `<Button>` JSX element. this is the single
// rule that preserves the "cyan is decorative, rafli-black is the action
// surface" contract — without it, a well-meaning `bg-primary` on a CTA
// silently paints it cyan and the hover-invert flip stops making sense.
//
// scope: native `<button>` + any JSX element whose name matches /Button$/
// (Button, IconButton, ToggleButton…). Components that WRAP a button but
// aren't named Button (e.g. custom `<Pill>`, `<Cta>`) are out of scope
// here — add their names to the allow-list below if the pattern repeats.
//
// pairs with:
//   * no-arbitrary-classname — blocks raw hex everywhere (defense in depth)
//   * marketing-radius-only-in-landing — other DESIGN.md contract guard

const CYAN_FILL =
  /\bbg-(?:primary|\[#(?:00b8ff|00B8FF|0ff|0FF)\])\b/;

function isButtonElement(name) {
  if (!name) return false;
  if (name.type === "JSXIdentifier") {
    if (name.name === "button") return true;
    return /Button$/.test(name.name);
  }
  if (name.type === "JSXMemberExpression") {
    return /Button$/.test(name.property?.name ?? "");
  }
  return false;
}

function scanString(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const m = value.match(CYAN_FILL);
  if (!m) return null;
  return { match: m[0] };
}

function scanNode(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") {
    const hit = scanString(node.value);
    if (hit) return { node, ...hit };
    return null;
  }
  if (node.type === "TemplateLiteral") {
    for (const q of node.quasis) {
      const hit = scanString(q.value.cooked ?? q.value.raw ?? "");
      if (hit) return { node: q, ...hit };
    }
    return null;
  }
  if (node.type === "CallExpression") {
    for (const arg of node.arguments) {
      const hit = scanNode(arg);
      if (hit) return hit;
    }
    return null;
  }
  if (node.type === "ConditionalExpression") {
    return scanNode(node.consequent) || scanNode(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return scanNode(node.left) || scanNode(node.right);
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow bg-primary (cyan) on <button>/<Button> — DESIGN.md: cyan is for links/progress/selection; buttons use rafli-black.",
    },
    messages: {
      noPrimary:
        'DESIGN.md violation: `{{ match }}` on a button surface. `primary` (cyan #00b8ff) is reserved for links, progress fills, and selection. Buttons, notification badges, and unread chips use `bg-rafli-black` / `bg-brand-dark` (#141416).',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!isButtonElement(node.name)) return;
        const classAttr = node.attributes.find(
          (a) => a.type === "JSXAttribute" && a.name?.name === "className"
        );
        if (!classAttr || !classAttr.value) return;
        const target =
          classAttr.value.type === "JSXExpressionContainer"
            ? classAttr.value.expression
            : classAttr.value;
        const hit = scanNode(target);
        if (hit) {
          context.report({
            node: hit.node,
            messageId: "noPrimary",
            data: { match: hit.match },
          });
        }
      },
    };
  },
};
