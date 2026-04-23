// -- shared AST walker for every rule that inspects Tailwind class strings.
// before extracting this helper, each rule (`no-arbitrary-classname`,
// `tailwind-v4-syntax`, `no-primary-on-button`, `no-small-clash-display`,
// `marketing-radius-only-in-landing`) re-implemented the same traversal —
// which meant patterns hidden inside `ObjectExpression` / `ArrayExpression`
// (e.g. a `VARIANT_CONFIG = { blue: { bg: 'bg-[#abc]' } }` lookup table
// that later feeds `className`) slipped past five separate linters even
// though their regexes would have matched if fed the literal.
//
// scanExpression(node, visit) walks the expression shapes we hit in real
// className code and calls `visit(stringNode, rawValue)` for every string
// we want the rule to inspect. each rule decides what to do with the hit.
//
// covered shapes:
//   * string literals: 'foo'
//   * template literals with no / multi interpolations: `foo ${x} bar`
//   * cn(...) / clsx(...) / tv(...) calls: iterate each argument
//   * conditional / logical expressions: both branches
//   * object expressions: every property value (scans config objects)
//   * array expressions: every element (scans class arrays)
//   * parenthesized / TS satisfies / as cast wrappers: unwrap and recurse
//
// the helper does NOT follow identifiers across files or variables —
// ESLint has no type information in flat config — but the object/array
// coverage catches the ~95% case in this repo where classes live in a
// co-located `VARIANT_CONFIG` / `VARIANTS` / inline `{ host, participant }`
// lookup.

function unwrap(node) {
	if (!node) return node;
	if (node.type === 'TSAsExpression') return unwrap(node.expression);
	if (node.type === 'TSSatisfiesExpression') return unwrap(node.expression);
	if (node.type === 'TSNonNullExpression') return unwrap(node.expression);
	if (node.type === 'TSTypeAssertion') return unwrap(node.expression);
	return node;
}

/**
 * Walk an expression node and invoke `visit` for every string-producing leaf.
 *
 * @param {import('estree').Node | null | undefined} node
 * @param {(stringNode: import('estree').Node, value: string) => void} visit
 * @returns {void}
 */
export function scanExpression(node, visit) {
	const target = unwrap(node);
	if (!target) return;

	if (target.type === 'Literal' && typeof target.value === 'string') {
		visit(target, target.value);
		return;
	}

	if (target.type === 'TemplateLiteral') {
		// -- emit each static quasi chunk; rules can decide whether to
		// treat them as full class lists or fragments.
		for (const q of target.quasis) {
			const raw = q.value.cooked ?? q.value.raw ?? '';
			if (raw.length > 0) visit(q, raw);
		}
		// -- each interpolated expression may itself resolve to a string
		// (cn-returning function, ternary in a template)
		for (const expr of target.expressions) scanExpression(expr, visit);
		return;
	}

	if (target.type === 'CallExpression') {
		for (const arg of target.arguments) scanExpression(arg, visit);
		return;
	}

	if (target.type === 'ConditionalExpression') {
		scanExpression(target.consequent, visit);
		scanExpression(target.alternate, visit);
		return;
	}

	if (target.type === 'LogicalExpression') {
		scanExpression(target.left, visit);
		scanExpression(target.right, visit);
		return;
	}

	if (target.type === 'ObjectExpression') {
		for (const prop of target.properties) {
			if (prop.type !== 'Property') continue;
			scanExpression(prop.value, visit);
		}
		return;
	}

	if (target.type === 'ArrayExpression') {
		for (const el of target.elements) {
			if (el) scanExpression(el, visit);
		}
		return;
	}
}

/**
 * Convenience wrapper for rules that only care about the className attribute
 * on a JSX element — walks the attribute value through scanExpression.
 *
 * @param {import('estree').Node} jsxAttribute
 * @param {(stringNode: import('estree').Node, value: string) => void} visit
 * @returns {void}
 */
export function scanClassNameAttribute(jsxAttribute, visit) {
	if (!jsxAttribute || !jsxAttribute.value) return;
	const target =
		jsxAttribute.value.type === 'JSXExpressionContainer'
			? jsxAttribute.value.expression
			: jsxAttribute.value;
	scanExpression(target, visit);
}
