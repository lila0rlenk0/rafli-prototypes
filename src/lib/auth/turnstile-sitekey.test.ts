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
//
// Audit M5 (2026-05) extended the rejection from production-only to ALL
// deployed environments — staging frequently runs against the real backend
// (real Turnstile secret, real DB, real Stripe test mode), so a test sitekey
// there is just as dangerous as in production.
describe('isProductionSafeTurnstileKey', () => {
	describe('blocks the test sitekey in every deployed environment', () => {
		test('production + test key → unsafe', () => {
			expect(
				isProductionSafeTurnstileKey(CLOUDFLARE_TEST_SITEKEY, 'production'),
			).toBe(false);
		});

		// Audit M5 closure: staging defaulting to the test sitekey was a quiet
		// failure mode — either DoSed every login (real backend secret) or
		// silently bypassed captcha (test backend secret). Both unacceptable
		// in any deployed environment, so the guard now rejects this pairing.
		test('staging + test key → unsafe', () => {
			expect(
				isProductionSafeTurnstileKey(CLOUDFLARE_TEST_SITEKEY, 'staging'),
			).toBe(false);
		});
	});

	describe('allows the test sitekey only in local development', () => {
		// Local dev still relies on the default test key landing without an
		// explicit `NEXT_PUBLIC_TURNSTILE_SITE_KEY` value — provisioning a
		// real key per developer would be friction with no security upside.
		test('development + test key → safe', () => {
			expect(
				isProductionSafeTurnstileKey(CLOUDFLARE_TEST_SITEKEY, 'development'),
			).toBe(true);
		});
	});

	describe('allows real sitekeys in every environment', () => {
		test('production + real key → safe', () => {
			expect(
				isProductionSafeTurnstileKey('0x1real-prod-key', 'production'),
			).toBe(true);
		});

		test('staging + real key → safe', () => {
			expect(
				isProductionSafeTurnstileKey('0x1real-prod-key', 'staging'),
			).toBe(true);
		});

		test('development + real key → safe', () => {
			expect(
				isProductionSafeTurnstileKey('0x1real-prod-key', 'development'),
			).toBe(true);
		});
	});
});
