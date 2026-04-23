// -- Coverage for the widened AST scan that reaches into
// `ObjectExpression` / `ArrayExpression` initializers. The pre-tighten
// rule only scanned JSXAttribute[name=className], which let class-string
// lookup tables (`VARIANT_CONFIG = { blue: { bg: 'bg-[#abc]' } }` in
// browse/featured-raffle-card.tsx and pricing/plan-card.tsx) slip past
// the regex even though the literal would have matched if scanned.
//
// The class-shape guard (`looksLikeClassList`) keeps the broader scope
// from chasing strings whose Tailwind-looking substring is a coincidence
// — SQL, SVG `d="..."`, URLs. Tested explicitly below.

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';
import rule from './no-arbitrary-classname.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser,
		parserOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			ecmaFeatures: { jsx: true },
		},
	},
});

ruleTester.run('no-arbitrary-classname', rule, {
	valid: [
		// -- data-[state=open] is an arbitrary SELECTOR, not value
		'const x = <div className="data-[state=open]:bg-primary" />',
		// -- no arbitrary value anywhere
		'const x = <div className="flex items-center gap-4 bg-primary" />',
		// -- strings that aren't class lists are ignored even if they
		// contain arbitrary-looking patterns
		'const sql = "SELECT * FROM users WHERE id-[123]"',
		'const url = "https://example.com/path-[abc]"',
		// -- mid-string hex that isn't in a Tailwind-prefix position
		'const code = "0x-[123]"',
		// -- non-className object property with non-class string
		'const cfg = { msg: "failure-[details] unknown" }',
	],
	invalid: [
		// -- the original path: arbitrary hex on a className attribute
		{
			code: 'const x = <div className="bg-[#fff]" />',
			errors: [{ messageId: 'noArbitrary' }],
		},
		// -- NEW: object property flowing into className later
		{
			code: `const CFG = { blue: { bg: 'bg-[#e1f8ff]' } };`,
			errors: [{ messageId: 'noArbitrary' }],
		},
		// -- NEW: nested object with CSS function arbitrary
		{
			code: `const CFG = { card: 'p-4 shadow-[0_1px_3px_rgb(0,0,0,0.1)]' };`,
			errors: [{ messageId: 'noArbitrary' }],
		},
		// -- NEW: array of class strings
		{
			code: `const t = ['rotate-[1.5deg] translate-x-2'];`,
			errors: [{ messageId: 'noArbitrary' }],
		},
		// -- NEW: plain string variable holding a class list
		{
			code: `const CLASS = 'bg-[#abc123] p-4';`,
			errors: [{ messageId: 'noArbitrary' }],
		},
	],
});
