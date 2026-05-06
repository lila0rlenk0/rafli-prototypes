import { describe, expect, test } from 'bun:test';

import {
	CLOUDFLARE_TEST_SITEKEY,
	isProductionSafeTurnstileKey,
} from './turnstile-sitekey';

// Cloudflare ships a public always-pass sitekey for local dev / CI. Pairing it
// with a real Turnstile secret in production produces 100% captcha failures
// (DoS); pairing it with the matching test secret silently bypasses the captcha
// (security regression). Either way the build must reject the combination
// before it ships, which is what this validator enforces.
describe('isProductionSafeTurnstileKey', () => {
	describe('blocks the test sitekey in production', () => {
		test('production + test key → unsafe', () => {
			expect(
				isProductionSafeTurnstileKey(CLOUDFLARE_TEST_SITEKEY, 'production'),
			).toBe(false);
		});
	});

	describe('allows the test sitekey outside production', () => {
		// Local dev and the staging build pipeline rely on the default test key
		// landing without an explicit `NEXT_PUBLIC_TURNSTILE_SITE_KEY` value.
		test('development + test key → safe', () => {
			expect(
				isProductionSafeTurnstileKey(CLOUDFLARE_TEST_SITEKEY, 'development'),
			).toBe(true);
		});

		test('staging + test key → safe', () => {
			expect(
				isProductionSafeTurnstileKey(CLOUDFLARE_TEST_SITEKEY, 'staging'),
			).toBe(true);
		});
	});

	describe('allows real sitekeys in every environment', () => {
		test('production + real key → safe', () => {
			expect(
				isProductionSafeTurnstileKey('0x1real-prod-key', 'production'),
			).toBe(true);
		});

		test('development + real key → safe', () => {
			expect(
				isProductionSafeTurnstileKey('0x1real-prod-key', 'development'),
			).toBe(true);
		});
	});
});
