// -- DESIGN.md: "Large marketing surfaces cap at `rounded-[80px]` — landing
// page only. Never inside application chrome." Previous iterations shipped
// with a 120px cap on the Trust section; the current design system lowers
// the marketing cap to 80px everywhere (landing section cards, Trust bleed,
// host/participant section cards all render at 80). 120px is now a bug,
// not a brand gesture.
//
// the oversized pill radius is a deliberate brand gesture on marketing
// surfaces — hero wells, Trust section blocks, section cards. inside app
// chrome (browse cards, forms, dashboards) the same radius reads as a
// mistake because it fights with the 16–24px card rhythm DESIGN.md
// mandates for every product card and panel.
//
// two-tier enforcement:
//   1. OUTSIDE landing: any arbitrary `rounded-[>= 48px]` is forbidden.
//      48px is the new floor where a corner crosses from "card" into
//      "marketing blob" — below that, arbitrary radii are still caught
//      by no-arbitrary-classname if out of token scope. Landing paths
//      (src/components/landing/**, src/app/(landing)/**) skip this tier.
//   2. INSIDE landing: `rounded-[> 80px]` is forbidden anywhere. The cap
//      was lowered from 120 → 80 in the latest DESIGN.md; ship-once
//      fixtures with 120/160/200 are flagged regardless of file path.

const MARKETING_RADIUS = /\brounded(?:-[trblxy]+|-[se])?-\[(\d+)(px|rem)\]/;
const OUTSIDE_LANDING_FLOOR_PX = 48;
const LANDING_CAP_PX = 80;

function toPx(num, unit) {
  return unit === "rem" ? num * 16 : num;
}

function extractViolations(value, { insideLanding }) {
  if (typeof value !== "string" || value.length === 0) return [];
  const hits = [];
  const regex = new RegExp(MARKETING_RADIUS.source, "g");
  let m;
  while ((m = regex.exec(value)) !== null) {
    const px = toPx(Number(m[1]), m[2]);
    if (insideLanding) {
      if (px > LANDING_CAP_PX) hits.push({ match: m[0], px, kind: "overCap" });
    } else {
      if (px >= OUTSIDE_LANDING_FLOOR_PX)
        hits.push({ match: m[0], px, kind: "outsideLanding" });
    }
  }
  return hits;
}

function scanNode(node, opts) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") {
    const hits = extractViolations(node.value, opts);
    if (hits.length) return { node, ...hits[0] };
    return null;
  }
  if (node.type === "TemplateLiteral") {
    for (const q of node.quasis) {
      const hits = extractViolations(
        q.value.cooked ?? q.value.raw ?? "",
        opts
      );
      if (hits.length) return { node: q, ...hits[0] };
    }
    return null;
  }
  if (node.type === "CallExpression") {
    for (const arg of node.arguments) {
      const hit = scanNode(arg, opts);
      if (hit) return hit;
    }
    return null;
  }
  if (node.type === "ConditionalExpression") {
    return scanNode(node.consequent, opts) || scanNode(node.alternate, opts);
  }
  if (node.type === "LogicalExpression") {
    return scanNode(node.left, opts) || scanNode(node.right, opts);
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Cap marketing radii at 80px on landing; forbid >= 48px outside landing (DESIGN.md).",
    },
    messages: {
      outsideLanding:
        '`{{ match }}` ({{ px }}px) is reserved for landing/marketing surfaces (DESIGN.md). Use `rounded-2xl` (cards) or `rounded-full` (pills) in product UI.',
      overCap:
        '`{{ match }}` ({{ px }}px) exceeds the 80px marketing cap (DESIGN.md § Shapes). The landing section cards and Trust bleed cap at `rounded-[80px]` — 120px is a legacy value and no longer valid.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const insideLanding =
      filename.includes("/src/components/landing/") ||
      filename.includes("/src/app/(landing)/");
    return {
      JSXAttribute(node) {
        if (node.name.name !== "className") return;
        if (!node.value) return;
        const target =
          node.value.type === "JSXExpressionContainer"
            ? node.value.expression
            : node.value;
        const hit = scanNode(target, { insideLanding });
        if (hit) {
          context.report({
            node: hit.node,
            messageId: hit.kind,
            data: { match: hit.match, px: hit.px },
          });
        }
      },
    };
  },
};
