import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
	]),
	{
		// Repo policy treats suppressions as hard failures.
		// Leaving this at "warn" lets forbidden `eslint-disable` drift linger.
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
		rules: {
			// `.claude/rules/eslint.md` bans all ts-comment escapes.
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-check': false,
					'ts-expect-error': true,
					'ts-ignore': true,
					'ts-nocheck': true,
				},
			],
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			// Imported config downgrades these; repo policy treats them as real failures.
			'no-unused-expressions': 'error',
			'@typescript-eslint/no-unused-expressions': 'error',
		},
	},
	// Disable ESLint rules that conflict with Prettier — must be last
	prettierConfig,
]);

export default eslintConfig;
