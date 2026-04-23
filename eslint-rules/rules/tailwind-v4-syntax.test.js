// -- Coverage for the patterns the tightened rule picks up beyond the
// original regex list: reverse-order leading pairs, decimal `space-x-*`,
// additional removed `*-opacity-*` utilities, new shorthand pairs
// (`px-N py-N`, `mx-N my-N`), and the widened AST scan that reaches into
// `ObjectExpression` / `ArrayExpression` initializers (a real-world miss
// from browse/featured-raffle-card.tsx).

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';
import rule from './tailwind-v4-syntax.js';

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

ruleTester.run('tailwind-v4-syntax', rule, {
	valid: [
		// -- v4 canonical pairings are quiet
		'const x = <div className="text-base/7" />',
		'const x = <div className="text-xl/none" />',
		'const x = <div className="size-4" />',
		'const x = <div className="p-4" />',
		'const x = <div className="m-3" />',
		'const x = <div className="truncate" />',
		'const x = <div className="min-h-dvh" />',
		'const x = <div className="bg-linear-to-r from-sky-100 to-sky-400" />',
		'const x = <div className="gap-4" />',
		'const x = <div className="z-(--z-toast)" />',
		// -- different variant stacks don't collapse
		'const x = <div className="sm:px-4 lg:py-4" />',
		// -- different integer values don't collapse
		'const x = <div className="px-4 py-6" />',
		// -- fractional / arbitrary values on the axes — out of shorthand scope
		'const x = <div className="w-1/2 h-1/2" />',
		'const x = <div className="w-[12px] h-[12px]" />',
	],
	invalid: [
		// -- reverse-order leading (`leading-* text-*`) — NEW, previously missed
		{
			code: 'const x = <div className="leading-7 text-base" />',
			errors: [{ messageId: 'banned' }],
		},
		{
			code: 'const x = <div className="leading-none text-xl" />',
			errors: [{ messageId: 'banned' }],
		},

		// -- decimal `space-x-*` — previously missed because `\d+` skipped `0.5`
		{
			code: 'const x = <div className="flex space-x-0.5" />',
			errors: [{ messageId: 'banned' }],
		},

		// -- additional removed opacity utilities
		{
			code: 'const x = <div className="ring-opacity-50" />',
			errors: [{ messageId: 'banned' }],
		},
		{
			code: 'const x = <div className="placeholder-opacity-30" />',
			errors: [{ messageId: 'banned' }],
		},
		{
			code: 'const x = <div className="accent-opacity-80" />',
			errors: [{ messageId: 'banned' }],
		},
		{
			code: 'const x = <div className="from-opacity-20" />',
			errors: [{ messageId: 'banned' }],
		},

		// -- new shorthand: equal `px-N py-N` collapses to `p-N`
		{
			code: 'const x = <div className="rounded-full px-4 py-4" />',
			errors: [{ messageId: 'banned' }],
		},
		// -- new shorthand: equal `mx-N my-N` collapses to `m-N`
		{
			code: 'const x = <div className="mx-2 my-2" />',
			errors: [{ messageId: 'banned' }],
		},
		// -- shorthand respects variant buckets — matching `lg:` prefix collapses
		{
			code: 'const x = <div className="lg:px-12 lg:py-12" />',
			errors: [{ messageId: 'banned' }],
		},

		// -- widened AST scan: object initializer that feeds className later
		{
			code: `
				const CONFIG = { blue: { bg: 'flex min-h-screen' } };
				const x = <div className={CONFIG.blue.bg} />
			`,
			errors: [{ messageId: 'banned' }],
		},
		// -- widened AST scan: array initializer
		{
			code: `const transforms = ['mx-2 my-2', 'mx-4 my-6'];`,
			errors: [{ messageId: 'banned' }],
		},
	],
});
