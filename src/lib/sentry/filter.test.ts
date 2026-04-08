import { describe, expect, test } from 'bun:test';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { filterEvent } from './filter';

/**
 * Creates a minimal Sentry ErrorEvent with optional tags.
 * Only includes fields that filterEvent actually reads.
 */
function createEvent(tags?: Record<string, string>): ErrorEvent {
	return { tags } as ErrorEvent;
}

/**
 * Creates an EventHint wrapping an original exception.
 * filterEvent reads hint.originalException for browser noise matching.
 */
function createHint(originalException?: unknown): EventHint {
	return { originalException } as EventHint;
}

describe('filterEvent', () => {
	describe('expected business error codes are dropped', () => {
		const expectedCodes = [
			'auth:user:invalid-credentials',
			'core:raffle:not-draft',
			'core:raffle:not-queued',
			'core:raffle:not-cancellable',
			'core:raffle:sold-out',
			'core:order:already-completed',
			'payments:crypto:already-paid',
			'core:promo:already-redeemed',
			'core:winning:not-found',
			'core:comment:self-vote',
			'core:review:not-eligible',
			'core:notification:not-found',
			'core:ticket:no-tickets',
			'moderation:report:duplicate',
			'client:upload:too-large',
			'payments:credits:insufficient-balance',
			'payments:credits:order-not-pending',
			'payments:credits:payment-session-active',
			'validation_error',
			'unauthorized',
			'forbidden',
		];

		for (const code of expectedCodes) {
			test(`drops ${code}`, () => {
				const event = createEvent({ errorCode: code });
				const result = filterEvent(event, createHint());
				expect(result).toBeNull();
			});
		}
	});

	describe('unexpected error codes pass through', () => {
		test('passes unknown error code', () => {
			const event = createEvent({ errorCode: 'core:raffle:unknown-thing' });
			const result = filterEvent(event, createHint());
			expect(result).toBe(event);
		});

		test('passes event with no errorCode tag', () => {
			const event = createEvent({});
			const result = filterEvent(event, createHint());
			expect(result).toBe(event);
		});

		test('passes event with no tags', () => {
			const event = createEvent();
			const result = filterEvent(event, createHint());
			expect(result).toBe(event);
		});
	});

	describe('network/timeout errors are sampled', () => {
		test('network_error gets fingerprinted when not dropped', () => {
			const event = createEvent({ errorCode: 'network_error' });
			// Run many times — at 10% sample rate, at least one should pass
			let passed = false;
			for (let i = 0; i < 200; i++) {
				const result = filterEvent(
					{ ...event, fingerprint: undefined },
					createHint(),
				);
				if (result !== null) {
					expect(result.fingerprint).toEqual(['network-transient']);
					passed = true;
					break;
				}
			}
			expect(passed).toBe(true);
		});

		test('timeout_error is subject to sampling', () => {
			const event = createEvent({ errorCode: 'timeout_error' });
			let dropped = 0;
			const runs = 100;
			for (let i = 0; i < runs; i++) {
				const result = filterEvent({ ...event }, createHint());
				if (result === null) dropped++;
			}
			// At 10% pass rate, ~90 should be dropped. Allow wide margin.
			expect(dropped).toBeGreaterThan(50);
		});
	});

	describe('browser noise is dropped', () => {
		const noisyMessages = [
			'ResizeObserver loop completed with undelivered notifications.',
			'ChunkLoadError: loading chunk 42 failed',
			'Loading chunk 7 failed after 3 retries',
			'chrome-extension://abc123/content.js',
			'moz-extension://some-addon/background.js',
			'extension://something',
		];

		for (const message of noisyMessages) {
			test(`drops "${message.slice(0, 40)}..."`, () => {
				const event = createEvent();
				const hint = createHint(new Error(message));
				const result = filterEvent(event, hint);
				expect(result).toBeNull();
			});
		}

		test('drops non-Error string exceptions matching noise', () => {
			const event = createEvent();
			const hint = createHint('ResizeObserver loop limit exceeded');
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		test('passes non-noisy error messages', () => {
			const event = createEvent();
			const hint = createHint(new Error('Unexpected token in JSON'));
			const result = filterEvent(event, hint);
			expect(result).toBe(event);
		});
	});

	describe('null/undefined originalException handling', () => {
		test('passes when originalException is null', () => {
			const event = createEvent();
			const result = filterEvent(event, createHint(null));
			expect(result).toBe(event);
		});

		test('passes when originalException is undefined', () => {
			const event = createEvent();
			const result = filterEvent(event, createHint(undefined));
			expect(result).toBe(event);
		});
	});
});
