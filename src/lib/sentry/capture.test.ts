import { describe, expect, test } from 'bun:test';
import type { Scope } from '@sentry/nextjs';
import { ZodError, z } from 'zod';

import {
	applyContractDriftScope,
	applyServiceErrorScope,
	shouldCaptureServiceError,
} from './capture';
import { EXPECTED_ERROR_CODES } from './filter';

/**
 * Unit tests for the pure scope-builder helpers extracted from
 * `captureServiceError` / `captureContractDrift`. These helpers take a
 * Sentry `Scope` and mutate it — the runtime wraps them in
 * `Sentry.withScope`, but the mutation contract is pure and can be
 * verified by passing a minimal fake scope.
 *
 * Testing the apply* functions directly (instead of mocking `@sentry/nextjs`
 * via `mock.module`) avoids Bun's process-wide module cache. Any prior
 * test that imports `@sentry/nextjs` would otherwise snapshot the real
 * bindings before our mock installs, producing flaky failures only in
 * the full suite. The pure-builder pattern sidesteps the problem.
 */

// ==========================================
// Fake scope
// ==========================================

interface RecordedScope {
	tags: Record<string, string>;
	level?: string;
	fingerprint?: readonly string[];
	contexts: Record<string, unknown>;
}

/**
 * Creates a fake Sentry scope that records every `setTag`, `setLevel`,
 * `setFingerprint`, and `setContext` call. Only the four methods used by
 * the apply* helpers are implemented — the rest is cast via `unknown` so
 * TypeScript doesn't force us to stub the entire Scope surface.
 */
function createFakeScope(): { scope: Scope; record: RecordedScope } {
	const record: RecordedScope = { tags: {}, contexts: {} };

	const scope = {
		setTag: (key: string, value: string) => {
			record.tags[key] = value;
		},
		setLevel: (level: string) => {
			record.level = level;
		},
		setFingerprint: (fingerprint: readonly string[]) => {
			record.fingerprint = fingerprint;
		},
		setContext: (key: string, value: unknown) => {
			record.contexts[key] = value;
		},
	} as unknown as Scope;

	return { scope, record };
}

// ==========================================
// applyServiceErrorScope
// ==========================================

describe('applyServiceErrorScope', () => {
	test('sets errorCode, service, action as indexed tags and level=error', () => {
		const { scope, record } = createFakeScope();

		applyServiceErrorScope(scope, 'payments:crypto:submit-failed', {
			service: 'payment',
			action: 'submit-crypto-tx',
		});

		expect(record.tags).toEqual({
			errorCode: 'payments:crypto:submit-failed',
			service: 'payment',
			action: 'submit-crypto-tx',
		});
		expect(record.level).toBe('error');
	});

	test('fingerprints by [service-error, service, action, errorCode]', () => {
		// Deterministic grouping is the primary lever for keeping the
		// Sentry issue list tractable. If the fingerprint order ever
		// drifts, unrelated stack variations would splinter a single
		// logical failure into many issues — this test pins the order.
		const { scope, record } = createFakeScope();

		applyServiceErrorScope(scope, 'payments:crypto:submit-failed', {
			service: 'payment',
			action: 'submit-crypto-tx',
		});

		expect(record.fingerprint).toEqual([
			'service-error',
			'payment',
			'submit-crypto-tx',
			'payments:crypto:submit-failed',
		]);
	});

	test('attaches full context (entity IDs) under the `service` key', () => {
		// Entity IDs are non-indexed but visible on every event — they
		// must round-trip exactly so debugging a single event has the
		// sessionId / txHash / chainId needed to reproduce.
		const { scope, record } = createFakeScope();

		applyServiceErrorScope(scope, 'payments:crypto:submit-failed', {
			service: 'payment',
			action: 'submit-crypto-tx',
			sessionId: 'sess-1',
			txHash: '0xabc',
			chainId: 1,
		});

		expect(record.contexts.service).toEqual({
			service: 'payment',
			action: 'submit-crypto-tx',
			sessionId: 'sess-1',
			txHash: '0xabc',
			chainId: 1,
		});
	});

	test('defensive-copies context so later mutation does not leak into Sentry', () => {
		// Spreads the incoming context into a fresh object; this guards
		// against a caller mutating the original after capture (e.g.
		// reusing the payload object for a retry) and silently
		// corrupting the already-captured event's context.
		const { scope, record } = createFakeScope();

		const ctx = {
			service: 'payment',
			action: 'submit-crypto-tx',
			sessionId: 'sess-1',
		};
		applyServiceErrorScope(scope, 'payments:crypto:submit-failed', ctx);

		(ctx as { sessionId: string }).sessionId = 'MUTATED';

		expect(record.contexts.service).toEqual({
			service: 'payment',
			action: 'submit-crypto-tx',
			sessionId: 'sess-1',
		});
	});
});

// ==========================================
// applyContractDriftScope
// ==========================================

describe('applyContractDriftScope', () => {
	test('tags errorCode=contract_drift + service + action and fingerprints per endpoint', () => {
		const { scope, record } = createFakeScope();

		// Build a real ZodError by parsing a failing schema — safer than
		// hand-rolling an issue array because Zod's type signature
		// changes across minor versions.
		let zodError: ZodError | null = null;
		try {
			z.object({
				body: z.string(),
				voteScore: z.number(),
			}).parse({ body: null, voteScore: 'bad' });
		} catch (err) {
			if (err instanceof ZodError) zodError = err;
		}
		if (!zodError) throw new Error('expected schema to fail');

		applyContractDriftScope(scope, zodError, {
			service: 'comment',
			action: 'get-my-comments',
		});

		expect(record.tags).toEqual({
			errorCode: 'contract_drift',
			service: 'comment',
			action: 'get-my-comments',
		});
		expect(record.level).toBe('error');
		expect(record.fingerprint).toEqual([
			'contract-drift',
			'comment',
			'get-my-comments',
		]);
	});

	test('flattens Zod issue paths to dotted strings in the zodIssues context', () => {
		const { scope, record } = createFakeScope();

		// Nested schema produces a multi-segment issue path — the helper
		// joins segments with "." so the Sentry UI shows "items.0.body"
		// instead of the JSON-serialized array. Covers the path-flattening
		// contract end-to-end.
		let zodError: ZodError | null = null;
		try {
			z.object({
				items: z.array(
					z.object({
						body: z.string(),
					}),
				),
			}).parse({ items: [{ body: null }] });
		} catch (err) {
			if (err instanceof ZodError) zodError = err;
		}
		if (!zodError) throw new Error('expected schema to fail');

		applyContractDriftScope(scope, zodError, {
			service: 'comment',
			action: 'get-my-comments',
		});

		const zodIssues = record.contexts.zodIssues as {
			issues: Array<{ path: string; code: string; message: string }>;
		};
		expect(zodIssues.issues).toHaveLength(1);
		expect(zodIssues.issues[0].path).toBe('items.0.body');
		// We don't assert the `message` string — it varies across Zod releases.
		expect(typeof zodIssues.issues[0].code).toBe('string');
	});
});

// ==========================================
// shouldCaptureServiceError
// ==========================================

describe('shouldCaptureServiceError', () => {
	test('returns false for every code in EXPECTED_ERROR_CODES', () => {
		// Every code on the expected list must short-circuit — this is the
		// predicate guaranteeing zero Sentry quota burn for known user-path
		// failures (invalid credentials, sold out, etc). Iterating the set
		// pins the contract so adding a new code without updating the set
		// would be caught here.
		for (const code of EXPECTED_ERROR_CODES) {
			expect(shouldCaptureServiceError(code)).toBe(false);
		}
	});

	test('returns true for unknown codes so genuine failures still reach Sentry', () => {
		expect(shouldCaptureServiceError('payments:crypto:submit-failed')).toBe(
			true,
		);
		expect(shouldCaptureServiceError('internal_server_error')).toBe(true);
	});
});
