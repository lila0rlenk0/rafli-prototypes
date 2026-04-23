// -- DESIGN.md typography: "Never Clash Display below 18px — loses character;
// Geist Sans reads better." Clash Display is the display family reserved
// for hero titles, section headlines, countdown digits, and mobile-menu
// overlays. at 14/12px it turns into visual noise with none of the brand
// recognition that earns its weight in the bundle.
//
// the rule flags any className that pairs `font-clash-display` (or the
// shorthand `font-clash`) with an explicit small text size token:
//   * `text-xs`   (12px)
//   * `text-sm`   (14px)
//
// 18px+ tokens (`text-base` and above) pass — that's the DESIGN.md floor.
//
// does NOT fire when the size is expressed via arbitrary `text-[13px]`;
// that arbitrary form is already caught by `no-arbitrary-classname`.

const CLASH_FONT = /\bfont-clash(?:-display)?\b/;
const SMALL_SIZES = /\btext-(?:xs|sm)\b/;

function scanString(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (!CLASH_FONT.test(value)) return null;
  const m = value.match(SMALL_SIZES);
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
        "Disallow Clash Display paired with text-xs/text-sm — DESIGN.md: never Clash Display below 18px.",
    },
    messages: {
      tooSmall:
        '`font-clash-display` paired with `{{ match }}` violates DESIGN.md — Clash Display below 18px loses character. Use Geist Sans (the default font) or raise the size to `text-base`+.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "className") return;
        if (!node.value) return;
        const target =
          node.value.type === "JSXExpressionContainer"
            ? node.value.expression
            : node.value;
        const hit = scanNode(target);
        if (hit) {
          context.report({
            node: hit.node,
            messageId: "tooSmall",
            data: { match: hit.match },
          });
        }
      },
    };
  },
};
