// -- tailwind-v4.md + responsive.md + DESIGN.md + .claude/skills/tailwind-css:
// enforce the v4 syntax the repo's CSS config is tuned to. each pattern
// below rewrites cleanly:
//
// v3 → v4 renames / removals:
//   * `bg-gradient-to-*`                  → `bg-linear-to-*`
//   * `bg-opacity-N` / `text-opacity-N`
//     / `border-opacity-N` / `divide-opacity-N`
//     / `ring-opacity-N` / `placeholder-opacity-N`
//     / `accent-opacity-N` / `backdrop-opacity-N`
//     / `from-opacity-N` / `to-opacity-N` / `via-opacity-N`
//                                         → color/opacity shorthand `<util>/NN`
//   * `text-* leading-N` / `text-* leading-<named>`
//                                         → `text-*/N` / `text-*/<named>`
//   * `min-h-screen`                      → `min-h-dvh` (mobile Safari chrome)
//
// shorthand (DESIGN.md + tailwind-css skill):
//   * `w-N h-N` equal                     → `size-N`
//   * `px-N py-N` equal                   → `p-N`
//   * `mx-N my-N` equal                   → `m-N`
//   * `space-x-*` / `space-y-*`           → `gap-*` on the parent flex/grid
//   * `overflow-hidden text-ellipsis whitespace-nowrap` → `truncate`
//
// theme-scoped / DESIGN.md:
//   * `z-[NN]`                            → `z-(--z-<name>)` token
//
// scope: walks className string/template literals, classes inside `cn()` /
// `clsx()` / `tv()`, both sides of conditional/logical expressions, AND
// every value inside an inline `ObjectExpression` / `ArrayExpression`. the
// last two catch the `VARIANT_CONFIG = { blue: { bg: 'bg-[#abc]' } }`
// pattern that used to slip past the regex because the literal lived on
// a property, not a JSX attribute.

import { scanExpression } from '../helpers/class-scanner.js';

// -- numeric value token used by every spacing/sizing util. supports
// integer, `.5` increments, fractional (`1/2`), the literal `px`, `full`,
// `auto`, and named steps (`sm`, `md`, ...). kept loose on purpose —
// shorthand detectors tighten when they need integer-only.
const NUM = '\\d+(?:\\.\\d+)?';

// -- class list of every built-in + custom text size token declared in
// globals.css. used by both the leading-numeric and leading-named
// detectors so the v4 slash syntax (`text-<size>/<leading>`) fires on
// every callsite, not just shadcn-adjacent ones.
const SIZE_TOKEN_ALT =
	'xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl' +
	'|display(?:-(?:hero(?:-mobile)?|lg|md|section(?:-mobile)?|browse|fluid-(?:md|lg|xl)))?' +
	'|headline-(?:lg|md|sm)' +
	'|body-(?:lg|md|sm)' +
	'|label(?:-(?:md|sm))?' +
	'|card-(?:price|title)' +
	'|caption' +
	'|countdown-digit' +
	'|mono-md' +
	'|h[2-4](?:-featured)?' +
	'|body-[lm]' +
	'|3xs|2xs|mini|30|40|60|72|80|160';

const NAMED_LEADING =
	'tight|snug|none|relaxed|loose|normal|dense|display|headline';

// -- BANNED_PATTERNS: regex scan for a legacy class anywhere in a
// className string (literal fragment). each entry rewrites 1:1 to its
// v4 successor so the `hint` can be copy/pasted into the fix.
const BANNED_PATTERNS = [
	{
		id: 'gradient',
		re: /\bbg-gradient-to-[trblxy]+\b/,
		hint: 'use `bg-linear-to-*` in Tailwind v4',
	},

	// -- every removed `*-opacity-N` utility. v4 folds these into the
	// color/opacity modifier syntax (`bg-red-500/60`, `text-black/60`).
	// listed individually so the hint can name the replacement.
	{
		id: 'bgOpacity',
		re: /\bbg-opacity-\d+\b/,
		hint: 'use color/opacity shorthand `bg-<token>/NN` in Tailwind v4',
	},
	{
		id: 'textOpacity',
		re: /\btext-opacity-\d+\b/,
		hint: 'use color/opacity shorthand `text-<token>/NN` in Tailwind v4',
	},
	{
		id: 'borderOpacity',
		re: /\bborder-opacity-\d+\b/,
		hint: 'use color/opacity shorthand `border-<token>/NN` in Tailwind v4',
	},
	{
		id: 'divideOpacity',
		re: /\bdivide-opacity-\d+\b/,
		hint: 'use color/opacity shorthand `divide-<token>/NN` in Tailwind v4',
	},
	{
		id: 'ringOpacity',
		re: /\bring-opacity-\d+\b/,
		hint: 'use color/opacity shorthand `ring-<token>/NN` in Tailwind v4',
	},
	{
		id: 'placeholderOpacity',
		re: /\bplaceholder-opacity-\d+\b/,
		hint: 'use color/opacity shorthand `placeholder:text-<token>/NN` in Tailwind v4',
	},
	{
		id: 'accentOpacity',
		re: /\baccent-opacity-\d+\b/,
		hint: 'use color/opacity shorthand `accent-<token>/NN` in Tailwind v4',
	},
	{
		id: 'backdropOpacity',
		re: /\bbackdrop-opacity-\d+\b/,
		hint: 'v4 keeps `backdrop-opacity-*` — confirm usage, otherwise fold into the background color with `/NN`',
	},
	{
		id: 'fromOpacity',
		re: /\bfrom-opacity-\d+\b/,
		hint: 'use gradient color/opacity shorthand `from-<token>/NN` in Tailwind v4',
	},
	{
		id: 'toOpacity',
		re: /\bto-opacity-\d+\b/,
		hint: 'use gradient color/opacity shorthand `to-<token>/NN` in Tailwind v4',
	},
	{
		id: 'viaOpacity',
		re: /\bvia-opacity-\d+\b/,
		hint: 'use gradient color/opacity shorthand `via-<token>/NN` in Tailwind v4',
	},

	// -- `text-{size} ... leading-N` (numeric line-height). v4 slash syntax
	// collapses to `text-{size}/{leading}`. Works in either order on the
	// token list, so we also emit the reverse match below (LEADING then
	// TEXT) to catch `leading-7 text-base`.
	{
		id: 'leadingNumericForward',
		re: new RegExp(
			`\\btext-(?:${SIZE_TOKEN_ALT})\\b[^"'\`]*\\bleading-${NUM}\\b`,
		),
		hint: 'pair size + line-height with the v4 slash syntax, e.g. `text-base/7`',
	},
	{
		id: 'leadingNumericReverse',
		re: new RegExp(
			`\\bleading-${NUM}\\b[^"'\`]*\\btext-(?:${SIZE_TOKEN_ALT})\\b`,
		),
		hint: 'pair size + line-height with the v4 slash syntax, e.g. `text-base/7`',
	},
	{
		id: 'leadingNamedForward',
		re: new RegExp(
			`\\btext-(?:${SIZE_TOKEN_ALT})\\b[^"'\`]*\\bleading-(?:${NAMED_LEADING})\\b`,
		),
		hint: 'pair size + line-height with the v4 slash syntax, e.g. `text-xl/none`',
	},
	{
		id: 'leadingNamedReverse',
		re: new RegExp(
			`\\bleading-(?:${NAMED_LEADING})\\b[^"'\`]*\\btext-(?:${SIZE_TOKEN_ALT})\\b`,
		),
		hint: 'pair size + line-height with the v4 slash syntax, e.g. `text-xl/none`',
	},

	{
		id: 'minhscreen',
		re: /\bmin-h-screen\b/,
		hint: 'use `min-h-dvh` — mobile Safari browser chrome breaks `100vh`',
	},

	// -- space-x/space-y remain broken on wrap (gap handles wrapping
	// correctly). allow decimal tokens (`space-x-0.5`) that the old rule
	// regex missed because `\d+` only matched integers.
	{
		id: 'spaceX',
		re: /\bspace-x-\d+(?:\.\d+)?\b/,
		hint: 'use `gap-*` on the parent flex/grid — `space-x-*` is legacy',
	},
	{
		id: 'spaceY',
		re: /\bspace-y-\d+(?:\.\d+)?\b/,
		hint: 'use `gap-*` on the parent flex/grid — `space-y-*` is legacy',
	},

	// -- arbitrary z-index numbers bypass the named scale in globals.css
	// (`--z-sticky`, `--z-sticky-hi`, `--z-sticky-peak`, `--z-toast`). the
	// skill's guidance is unambiguous: `z-[NN]` is never the right call —
	// pick or add a token and reference it as `z-(--z-<name>)`.
	{
		id: 'arbitraryZ',
		re: /\bz-\[\d+\]/,
		hint: 'use `z-(--z-<name>)` with a token from globals.css — never `z-[NN]`',
	},
];

// -- shorthand detector: parse each whitespace-separated token, bucket by
// variant prefix (`md:`, `hover:`, `dark:md:`, ...) + important prefix
// (`!`). within the same bucket, two axis utilities with the SAME integer
// value collapse to the shorthand. this is more precise than regex —
// `sm:px-4 lg:py-4` won't falsely flag because the variant buckets differ.
function parseToken(token) {
	if (!token) return null;
	// -- last colon splits all variant prefixes (`md:`, `dark:md:hover:`,
	// etc.) from the base utility. preserves everything to the left for
	// bucketing — two tokens with different variant stacks can't shorthand.
	const colonIdx = token.lastIndexOf(':');
	const variants = colonIdx >= 0 ? token.slice(0, colonIdx + 1) : '';
	let base = colonIdx >= 0 ? token.slice(colonIdx + 1) : token;
	// -- negative prefix (`-mx-4`) lives outside the variant chain
	const negative = base.startsWith('-');
	if (negative) base = base.slice(1);
	// -- v4 important modifier is a trailing `!` (not a leading one). keep
	// it bucketed separately; `p-4` and `p-4!` are different utilities.
	const important = base.endsWith('!');
	if (important) base = base.slice(0, -1);
	return { variants, negative, important, base };
}

function equalShorthandMatch(tokens, axisA, axisB, shorthand, axisBase) {
	// -- bucket = variants + negative + important — every dimension that
	// must agree before a shorthand can collapse the pair
	const buckets = new Map();
	for (const t of tokens) {
		if (!t) continue;
		let axis = null;
		let value = null;
		if (t.base.startsWith(axisA + '-')) {
			axis = 'a';
			value = t.base.slice(axisA.length + 1);
		} else if (t.base.startsWith(axisB + '-')) {
			axis = 'b';
			value = t.base.slice(axisB.length + 1);
		}
		if (axis === null) continue;
		// -- integer + `.5`-style only; skip arbitrary `[12px]`, fractional
		// `1/2`, and keywords (`auto`, `full`) because the shorthand
		// collapses differently (or not at all) for those.
		if (!/^\d+(?:\.\d+)?$/.test(value)) continue;
		const key = `${t.variants}|${t.negative ? '-' : ''}|${t.important ? '!' : ''}`;
		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key).push({ axis, value, raw: reassemble(t, axis === 'a' ? axisA : axisB, value) });
	}
	for (const [, arr] of buckets) {
		const a = arr.find((x) => x.axis === 'a');
		const b = arr.find((x) => x.axis === 'b');
		if (a && b && a.value === b.value) {
			const negMark = a.raw.startsWith('-') ? '-' : '';
			return {
				id: shorthand,
				match: `${a.raw} ${b.raw}`,
				hint: `use \`${negMark}${axisBase}-${a.value}\` shorthand — .claude/rules/tailwind-v4.md`,
			};
		}
	}
	return null;
}

function reassemble(tok, axisPrefix, value) {
	const neg = tok.negative ? '-' : '';
	const imp = tok.important ? '!' : '';
	return `${tok.variants}${neg}${axisPrefix}-${value}${imp}`;
}

// -- truncate combo: `overflow-hidden text-ellipsis whitespace-nowrap` in
// any order collapses to `truncate`. order-agnostic token check avoids
// regex gymnastics.
function matchesTruncateCombo(tokens) {
	let hasOverflowHidden = false;
	let hasTextEllipsis = false;
	let hasWhitespaceNowrap = false;
	for (const t of tokens) {
		if (!t) continue;
		// -- truncate semantics are order-independent but variants must
		// match. check the union on the unprefixed base first; a mixed
		// variant stack (`md:overflow-hidden text-ellipsis ...`) is not
		// a valid collapse target.
		if (t.variants !== '') continue;
		if (t.base === 'overflow-hidden') hasOverflowHidden = true;
		else if (t.base === 'text-ellipsis') hasTextEllipsis = true;
		else if (t.base === 'whitespace-nowrap') hasWhitespaceNowrap = true;
	}
	return hasOverflowHidden && hasTextEllipsis && hasWhitespaceNowrap;
}

function scanString(value) {
	if (typeof value !== 'string' || value.length === 0) return null;
	// -- fast-path regex scan for simple single-token violations
	for (const { id, re, hint } of BANNED_PATTERNS) {
		const m = value.match(re);
		if (m) return { id, match: m[0], hint };
	}
	// -- token-based shorthand scans. more precise than regex because
	// they honor variant buckets + negative/important modifiers.
	const tokens = value.split(/\s+/).map(parseToken);
	const shorthand =
		equalShorthandMatch(tokens, 'w', 'h', 'size', 'size') ||
		equalShorthandMatch(tokens, 'px', 'py', 'padding', 'p') ||
		equalShorthandMatch(tokens, 'mx', 'my', 'margin', 'm');
	if (shorthand) return shorthand;
	if (matchesTruncateCombo(tokens)) {
		return {
			id: 'truncate',
			match: 'overflow-hidden text-ellipsis whitespace-nowrap',
			hint: 'use `truncate` shorthand — .claude/rules/tailwind-v4.md',
		};
	}
	return null;
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Tailwind v3 syntax and legacy combos — enforce v4 + responsive.md + DESIGN.md.',
		},
		messages: {
			banned:
				'Tailwind v4 violation: `{{ match }}` — {{ hint }}. See .claude/rules/tailwind-v4.md.',
		},
		schema: [],
	},
	create(context) {
		// -- one unified reporter so both the JSX-attribute path and the
		// object/array-lookup path share the same message shape.
		function report(stringNode, hit) {
			context.report({
				node: stringNode,
				messageId: 'banned',
				data: { match: hit.match, hint: hit.hint },
			});
		}

		function inspect(node) {
			scanExpression(node, (stringNode, value) => {
				const hit = scanString(value);
				if (hit) report(stringNode, hit);
			});
		}

		return {
			// -- primary path: className on JSX elements
			JSXAttribute(node) {
				if (node.name.name !== 'className') return;
				if (!node.value) return;
				const target =
					node.value.type === 'JSXExpressionContainer'
						? node.value.expression
						: node.value;
				inspect(target);
			},

			// -- secondary path: class-string lookup tables at module or
			// component scope (`const VARIANT_CONFIG = { blue: { bg: '...' } }`).
			// only inspect initializers that explicitly live in a Tailwind-
			// like shape — object/array/string/template/cn-call — so we
			// don't chase arbitrary variables whose values happen to be
			// strings.
			VariableDeclarator(node) {
				const init = node.init;
				if (!init) return;
				if (
					init.type === 'ObjectExpression' ||
					init.type === 'ArrayExpression' ||
					init.type === 'TemplateLiteral' ||
					init.type === 'Literal' ||
					(init.type === 'TSAsExpression' && init.expression)
				) {
					inspect(init);
				}
			},
		};
	},
};
