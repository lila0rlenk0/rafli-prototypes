import 'server-only';

import { describe, expect, test } from 'bun:test';

import { resolveMock } from './registry';

/**
 * Registry resolver tests. `resolveMock` is pure (state passed explicitly), so
 * these run without a request context — they pin the contract the dev preview
 * relies on: list filtering, the toggleable subscription envelope, and the
 * Buy-flow checkout redirect landing on the local pending page.
 */
describe('resolveMock', () => {
	test('filters /raffles by live status', () => {
		const result = resolveMock({
			method: 'GET',
			path: '/raffles',
			params: { status: 'live' },
			body: undefined,
			state: 'guest',
		}) as { raffles: { status: string }[] };

		expect(result.raffles.length).toBeGreaterThan(0);
		expect(result.raffles.every(r => r.status === 'live')).toBe(true);
	});

	test('filters /raffles by completed status', () => {
		const result = resolveMock({
			method: 'GET',
			path: '/raffles',
			params: { status: 'completed' },
			body: undefined,
			state: 'guest',
		}) as { raffles: { status: string }[] };

		expect(result.raffles.every(r => r.status === 'completed')).toBe(true);
	});

	test('resolves a raffle by slug', () => {
		const result = resolveMock({
			method: 'GET',
			path: '/raffles/mock-live-macbook',
			params: undefined,
			body: undefined,
			state: 'guest',
		}) as { publicSlugOrCode: string } | undefined;

		expect(result?.publicSlugOrCode).toBe('mock-live-macbook');
	});

	test('subscription envelope reflects the active state', () => {
		const result = resolveMock({
			method: 'GET',
			path: '/me/subscription',
			params: undefined,
			body: undefined,
			state: 'active',
		}) as { subscription: { status: string } | null };

		expect(result.subscription?.status).toBe('active');
	});

	test('subscription envelope is empty for the "none" state', () => {
		const result = resolveMock({
			method: 'GET',
			path: '/me/subscription',
			params: undefined,
			body: undefined,
			state: 'none',
		}) as { subscription: unknown };

		expect(result.subscription).toBeNull();
	});

	test('checkout POST returns a local pending URL for the plan tier', () => {
		const result = resolveMock({
			method: 'POST',
			path: '/payments/fanbasis/public-subscription-checkout',
			params: undefined,
			body: { email: 'buyer@example.com', planSlug: 'pro_access_pass' },
			state: 'guest',
		}) as { checkoutUrl: string };

		expect(result.checkoutUrl).toContain('/subscription-pending-pro');
		expect(result.checkoutUrl).toContain('email=buyer%40example.com');
	});

	test('checkout POST maps the basic tier', () => {
		const result = resolveMock({
			method: 'POST',
			path: '/payments/fanbasis/public-subscription-checkout',
			params: undefined,
			body: { email: 'b@x.com', planSlug: 'basic_access_pass' },
			state: 'guest',
		}) as { checkoutUrl: string };

		expect(result.checkoutUrl).toContain('/subscription-pending-basic');
	});

	test('unmapped routes return undefined', () => {
		expect(
			resolveMock({
				method: 'GET',
				path: '/some/unknown/endpoint',
				params: undefined,
				body: undefined,
				state: 'guest',
			}),
		).toBeUndefined();
	});
});
