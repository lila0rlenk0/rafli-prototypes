import { describe, expect, test } from 'bun:test';

import { shouldSkipWeb3 } from './web3-skip-routes';

/**
 * Pure-predicate unit tests for the wallet-free route gate used by
 * Web3Provider. The wider provider wiring (dynamic import +
 * WagmiProvider mount) is exercised in E2E flows — here we only pin
 * the gate so the list of wallet-free routes can evolve without the
 * hook-order fix regressing.
 *
 * Anchors: Sentry RAFLI-P root cause — mounting WagmiProvider on
 * `/admin/*` swapped the subtree shape mid-session. The predicate
 * below decides whether the swap is suppressed.
 */
describe('shouldSkipWeb3', () => {
	describe('admin prefixes are skipped', () => {
		const adminPaths = [
			'/admin',
			'/admin/',
			'/admin/verification',
			'/admin/verification/abc-123',
		];

		for (const pathname of adminPaths) {
			test(`skips ${pathname}`, () => {
				expect(shouldSkipWeb3(pathname)).toBe(true);
			});
		}
	});

	describe('public and auth routes are not skipped', () => {
		const publicPaths = [
			'/',
			'/browse',
			'/browse/some-raffle-slug',
			'/sign-in',
			'/sign-up',
			'/verification',
			'/verification/abc',
			'/profile',
		];

		for (const pathname of publicPaths) {
			test(`does not skip ${pathname}`, () => {
				expect(shouldSkipWeb3(pathname)).toBe(false);
			});
		}
	});

	describe('edge cases', () => {
		test('returns false for null pathname (pre-hydration)', () => {
			expect(shouldSkipWeb3(null)).toBe(false);
		});

		test('returns false for empty string pathname', () => {
			expect(shouldSkipWeb3('')).toBe(false);
		});

		// Prefix match is boundary-aware: `/adminish` must NOT collide
		// with `/admin`. The predicate splits on `/` so a future route
		// cannot accidentally opt out of Web3 by sharing a prefix.
		test('segment-boundary guard: /adminish does not match /admin', () => {
			expect(shouldSkipWeb3('/adminish')).toBe(false);
		});

		test('segment-boundary guard: /admin-preview does not match /admin', () => {
			expect(shouldSkipWeb3('/admin-preview')).toBe(false);
		});
	});
});
