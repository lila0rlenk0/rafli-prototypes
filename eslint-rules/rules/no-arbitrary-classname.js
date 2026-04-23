// -- disallow arbitrary Tailwind values in className (e.g., bg-[#fff], w-[347px])
// forces use of theme tokens defined in globals.css — ensures design consistency
// aligns with DESIGN.md: "Do use semantic tokens (bg-primary, text-muted-foreground,
// border-border). Raw hex only in brand-accent contexts (yellow/mint/sky marketing)."
//
// scope (updated): previously only JSXAttribute[name=className]. that missed
// the `const VARIANT_CONFIG = { blue: { bg: 'bg-[#e1f8ff]' } }` pattern used
// in browse/featured-raffle-card.tsx and pricing/plan-card.tsx — the string
// literal that eventually reaches className lives on an object property, so
// the regex never ran on it. the rule now walks class-producing expressions
// through the shared `scanExpression` helper, covering ObjectExpression /
// ArrayExpression / cn-call / conditional shapes.

import {
	scanExpression,
	scanClassNameAttribute,
} from '../helpers/class-scanner.js';

// -- matches arbitrary VALUES but not arbitrary SELECTORS (data-[state=open])
// detects: hex colors [#...], numbers [123...], CSS functions [rgb/hsl/oklch/var/calc]
const ARBITRARY_VALUE = /\w-\[(?:#[0-9a-fA-F]|\d|rgb|hsl|oklch|var\(|calc\()/;

// -- tighter guard for the extended scope (variables, object props, return
// values): only flag if the string LOOKS like a Tailwind class list. keeps
// the rule from firing on SQL, URL templates, or random strings that
// happen to contain `x-[#...]`. a "class-list" here is a string with at
// least one Tailwind-shaped token on each side of whitespace OR a single
// token where the first non-variant char is a Tailwind utility prefix.
const TAILWIND_TOKEN_PREFIX =
	/^(?:[a-z0-9-]+:)*-?(?:[a-z]|[a-z][a-z0-9-]*-)[a-z0-9[\]()/#.,%_\-]*$/;

function looksLikeClassList(value) {
	if (typeof value !== 'string') return false;
	const tokens = value.trim().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return false;
	// -- accept strings where every token parses as a Tailwind-shaped
	// utility. cheap + conservative — misses exotic utilities but is
	// safe against false positives in URLs, queries, and identifiers.
	return tokens.every((t) => TAILWIND_TOKEN_PREFIX.test(t));
}

function firstArbitraryHit(value) {
	const m = value.match(ARBITRARY_VALUE);
	return m ? m[0] : null;
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow arbitrary Tailwind values in className — use theme tokens from globals.css',
		},
		messages: {
			noArbitrary:
				'Arbitrary Tailwind value "{{ value }}" found. Use a theme token from globals.css (see DESIGN.md).',
		},
		schema: [],
	},
	create(context) {
		function reportIfHit(stringNode, rawValue, { requireClassShape }) {
			// -- `requireClassShape` prevents the broadened scope from
			// chasing strings whose Tailwind-looking substring is a
			// coincidence (e.g. an SVG `d="..."` attribute that contains
			// `L-[...]`). JSXAttribute[name=className] skips the check —
			// if it's in className, we already know it's a class string.
			if (requireClassShape && !looksLikeClassList(rawValue)) return;
			const match = firstArbitraryHit(rawValue);
			if (!match) return;
			context.report({
				node: stringNode,
				messageId: 'noArbitrary',
				data: { value: match },
			});
		}

		return {
			// -- primary: className attribute on JSX elements
			JSXAttribute(node) {
				if (node.name.name !== 'className') return;
				scanClassNameAttribute(node, (stringNode, value) => {
					reportIfHit(stringNode, value, { requireClassShape: false });
				});
			},

			// -- secondary: VARIANT_CONFIG-style lookup tables that flow
			// into className. guarded by the class-shape check so only
			// strings that parse as a Tailwind class list are inspected.
			VariableDeclarator(node) {
				const init = node.init;
				if (!init) return;
				if (
					init.type !== 'ObjectExpression' &&
					init.type !== 'ArrayExpression' &&
					init.type !== 'TemplateLiteral' &&
					init.type !== 'Literal' &&
					init.type !== 'TSAsExpression'
				) {
					return;
				}
				scanExpression(init, (stringNode, value) => {
					reportIfHit(stringNode, value, { requireClassShape: true });
				});
			},
		};
	},
};
