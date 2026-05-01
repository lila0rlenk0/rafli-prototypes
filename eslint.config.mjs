// -- ESLint flat config for Next.js 16 + TypeScript + custom local rules
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import localPlugin from './eslint-rules/index.js';

const eslintConfig = defineConfig([
	// -- Next.js recommended rules (react, react-hooks, jsx-a11y, @next/next)
	...nextVitals,

	// -- TypeScript-ESLint recommended rules (@typescript-eslint/*)
	...nextTs,

	// -- global ignores
	globalIgnores([
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
		'playwright-report/**',
		'test-results/**',
		'.claude/worktrees/**',
	]),

	{
		// -- repo policy treats suppressions as hard failures. leaving this
		// at "warn" lets forbidden `eslint-disable` drift linger
		// (.claude/rules/eslint.md).
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
	},

	// -- stricter TypeScript rules on top of eslint-config-next/typescript
	{
		files: ['**/*.{ts,tsx}'],
		rules: {
			// -- .claude/rules/eslint.md bans all ts-comment escapes
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-check': false,
					'ts-expect-error': true,
					'ts-ignore': true,
					'ts-nocheck': true,
				},
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' },
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			// -- code-style.md: no `!` non-null assertions; narrow instead
			'@typescript-eslint/no-non-null-assertion': 'error',
			// -- imported config downgrades these; repo policy treats them
			// as real failures
			'no-unused-expressions': 'error',
			'@typescript-eslint/no-unused-expressions': 'error',
		},
	},

	// -- clean code rules (built-in ESLint) — mechanical enforcement of
	// .claude/rules/code-style.md
	{
		files: ['**/*.{ts,tsx}'],
		// -- `src/components/ui/` is shadcn-managed + bundled Lexical editor
		// (code-style.md "skip for audits and complexity scans"). Keep the
		// exemption consistent across rule categories — the TSX complexity
		// config below uses the same ignore, so enforcing `max-params` on
		// vendored code here would split the policy.
		ignores: ['src/components/ui/**', 'src/components/ui-custom/**'],
		rules: {
			// -- max 3 parameters — use an options object beyond that
			'max-params': ['warn', { max: 3 }],
			// -- "early returns over nested conditionals" (code-style.md)
			'no-nested-ternary': 'error',
			'no-else-return': ['error', { allowElseIf: false }],
			// -- "no shortcuts, no TODOs, no 'we'll handle it later'". any
			// of these markers means the change isn't finished; land it or
			// file it.
			'no-warning-comments': [
				'error',
				{
					terms: ['todo', 'fixme', 'xxx', 'hack', 'handle later', "we'll handle"],
					location: 'anywhere',
				},
			],
			// -- template literals over `+` concat
			'prefer-template': 'error',
			// -- no wildcard re-exports — explicit imports only
			'no-restricted-syntax': [
				'error',
				{
					selector: 'ExportAllDeclaration',
					message: 'No wildcard exports (export *). Use explicit named exports.',
				},
			],
		},
	},

	// -- size/complexity caps live on a split config because the ideal
	// threshold depends on file kind:
	//   * pure .ts logic (lib/, services-adjacent) aims for tight ~60-line
	//     functions and complexity 12
	//   * .tsx components are inherently longer because JSX adds vertical
	//     weight that carries no branching cost; 150 / 20 matches the real
	//     shape of pages/forms/tables without routinely flagging code that
	//     meets our actual standard
	//   * src/services/**/*.ts mirrors the server-action handler shape:
	//     validate → re-auth → call lib/api → parse → map errors → return
	//     ServiceResponse; ~150 lines per file tracks that contract, not
	//     carelessness (services.md)
	//   * src/components/ui/ is shadcn-managed and out of scope for our rules
	{
		files: ['**/*.ts'],
		ignores: [
			'src/services/**',
			'eslint-rules/**',
			// -- shadcn primitives + bundled Lexical editor live under ui/;
			// both are vendored code, out of scope for our complexity caps
			// (code-style.md "src/components/ui/ is shadcn stock — skip for
			// audits and complexity scans"). Keeping the ignore consistent
			// with the `.tsx` config below avoids a split enforcement where
			// vendored .ts files (editor transformers, utils) get flagged
			// while their .tsx siblings don't.
			'src/components/ui/**',
			'src/components/ui-custom/**',
		],
		rules: {
			'max-lines-per-function': [
				'warn',
				{ max: 60, skipBlankLines: true, skipComments: true, IIFEs: true },
			],
			complexity: ['warn', { max: 12 }],
		},
	},
	{
		files: ['**/*.tsx', 'src/services/**/*.ts'],
		ignores: ['src/components/ui/**', 'src/components/ui-custom/**'],
		rules: {
			'max-lines-per-function': [
				'warn',
				{ max: 150, skipBlankLines: true, skipComments: true, IIFEs: true },
			],
			complexity: ['warn', { max: 20 }],
		},
	},

	// -- exclude eslint-rules from import/no-anonymous-default-export
	{
		files: ['eslint-rules/**/*.js'],
		rules: {
			'import/no-anonymous-default-export': 'off',
		},
	},

	// -- local custom rules for all source files (excluding shadcn/ui primitives)
	{
		files: ['**/*.{ts,tsx}'],
		ignores: [
			'src/components/ui/**',
			// Non–shadcn stock built on shadcn primitives; same relaxations as
			// `ui/` re arbitraries + domain-folder rule (excluded from strict tailwind/comment rules for parity with pre-move ui paths).
			'src/components/ui-custom/**',
			'eslint-rules/**',
		],
		plugins: { local: localPlugin },
		rules: {
			'local/kebab-case-filename': 'error',
			'local/no-deep-relative-imports': 'error',
			'local/no-default-export': 'error',
			'local/no-arbitrary-classname': 'error',
			'local/no-inline-style': 'warn',
			'local/boolean-naming': 'warn',
			// -- BFF boundary: all HTTP goes through the typed client
			'local/no-fetch-outside-lib-api': 'error',
			// -- BFF boundary: src/lib/api/ must be unambiguously server-only
			'local/require-server-only': 'error',
			// -- components/ must be grouped by domain subfolder
			'local/components-in-domain-folder': 'error',
			// -- comments.md: `// <text>` spacing, no `//foo` / `//  foo`
			'local/comment-format': 'error',
			// -- comments.md: keep comments on the line above the code
			'local/no-inline-trailing-comment': 'error',
			// -- code-style.md: handle* for local handlers, on* for prop types
			'local/event-handler-naming': 'error',
			// -- code-style.md: delete dead code, never comment it out
			'local/no-commented-out-code': 'error',
			// -- data-fetching.md: RSC + lib/api/ or server actions, never
			// useEffect + fetch
			'local/no-useeffect-data-fetch': 'error',
			// -- tailwind-v4.md + responsive.md + DESIGN.md: v4 utilities
			// the globals.css config is tuned for
			'local/tailwind-v4-syntax': 'error',
			// -- DESIGN.md: oversized marketing radii live in landing only
			'local/marketing-radius-only-in-landing': 'error',
			// -- DESIGN.md typography: never Clash Display below 18px
			'local/no-small-clash-display': 'error',
			// -- DESIGN.md colors: primary (cyan) is for links/progress/selection
			// only; buttons + notification badges + unread chips use rafli-black
			'local/no-primary-on-button': 'error',
			'local/no-disinformative-names': 'error',
			'local/no-flag-argument': 'error',
			'local/no-train-wreck': 'error',
			'local/no-journal-comment': 'error',
			'local/no-redundant-else': 'error',
			// -- tailwind-css skill: `cn("static string")` adds merge overhead
			// for zero benefit — drop the wrapper when the arg list has no
			// conditionals or interpolations
			'local/no-cn-static-only': 'error',
			// -- TanStack Query result handles are referentially unstable per
			// render — putting one in a useEffect/useMemo/useCallback deps
			// array causes the hook to re-fire every render. 2026-04-28 prod
			// incident: chat mark_read WS storm (~150 frames/min/user).
			// Destructure `mutate`/`data` and depend on those instead.
			'local/no-mutation-handle-in-deps': 'error',
		},
	},

	// -- App Router files are allowed default exports (required by Next.js).
	// the glob list covers both route-segment files and the metadata file
	// conventions — Next.js expects `export default` on every one of these
	// by name; a named export silently breaks the build-time route-manifest
	// wiring.
	{
		files: [
			'src/app/**/page.tsx',
			'src/app/**/layout.tsx',
			'src/app/**/loading.tsx',
			'src/app/**/error.tsx',
			'src/app/**/not-found.tsx',
			'src/app/**/default.tsx',
			'src/app/**/global-error.tsx',
			'src/app/**/template.tsx',
			'src/app/**/route.{ts,js}',
			// -- metadata file conventions
			'src/app/**/icon.{ts,tsx,js,jsx}',
			'src/app/**/apple-icon.{ts,tsx,js,jsx}',
			'src/app/**/opengraph-image.{ts,tsx,js,jsx}',
			'src/app/**/twitter-image.{ts,tsx,js,jsx}',
			'src/app/**/manifest.{ts,js}',
			'src/app/**/sitemap.{ts,js}',
			'src/app/**/robots.{ts,js}',
		],
		rules: {
			'local/no-default-export': 'off',
		},
	},

	// -- ImageResponse-based routes render into a Satori/Resvg pipeline that
	// only understands inline style props — Tailwind utilities aren't in
	// scope for the rasterizer. disabling the inline-style rule here is
	// architectural, not a style preference.
	{
		files: [
			'src/app/**/icon.{ts,tsx}',
			'src/app/**/apple-icon.{ts,tsx}',
			'src/app/**/opengraph-image.{ts,tsx}',
			'src/app/**/twitter-image.{ts,tsx}',
		],
		rules: {
			'local/no-inline-style': 'off',
		},
	},

	// -- config files at the repo root are consumed by tools that require
	// a default export (Playwright reads `export default`; the Next config
	// chain does too).
	{
		files: ['playwright.config.ts', '*.config.ts', 'sentry.*.config.ts'],
		rules: {
			'local/no-default-export': 'off',
		},
	},

	// -- test files: relax size/complexity caps (tests are naturally long
	// and repetitive by design — arrange/act/assert triples add mechanical
	// lines).
	{
		files: [
			'src/**/*.test.{ts,tsx}',
			'tests/**/*.ts',
			'e2e/**/*.ts',
		],
		plugins: { local: localPlugin },
		rules: {
			'local/no-default-export': 'off',
			'max-params': 'off',
			'max-lines-per-function': 'off',
			complexity: 'off',
			// -- tests commonly assert post-setup state via `result.current!`
			// patterns. we trust the test author's setup; the guarantee is
			// scoped to that test, not the runtime contract.
			'@typescript-eslint/no-non-null-assertion': 'off',
			// -- testing.md + e2e hygiene: explicit assertions only, no
			// parked / narrowed runs, no arbitrary sleeps
			'local/no-snapshot-tests': 'error',
			'local/no-test-only-or-skip': 'error',
			'local/no-wait-for-timeout': 'error',
			// -- integration/e2e: deep `result.data.*` chains are mechanical asserts;
			// boolean params in Playwright helpers are not public API.
			'local/no-train-wreck': 'off',
			'local/no-flag-argument': 'off',
		},
	},

	// -- disable ESLint rules that conflict with Prettier — must be last
	prettierConfig,
]);

export default eslintConfig;
