import { describe, expect, test } from 'bun:test';

import {
	fanbasisPublicCreditSessionKey,
	fanbasisPublicCreditSessionQueryOptions,
} from './use-fanbasis-public-credit-session';

describe('fanbasisPublicCreditSessionQueryOptions', () => {
	test('reuses the minted Fanbasis session across short navigation hops, never auto-refreshes', () => {
		// Token-bound query key — solving a fresh challenge keys a new
		// React Query entry, so a rejected mint cannot be served from cache.
		const options = fanbasisPublicCreditSessionQueryOptions('token-abc');

		expect(options.queryKey).toEqual(
			fanbasisPublicCreditSessionKey('token-abc'),
		);
		// 5-minute gcTime — within one tab session, navigating away and back
		// reuses the same minted session instead of hammering the backend broker.
		expect(options.gcTime).toBe(5 * 60 * 1000);
		expect(options.staleTime).toBe(Infinity);
		expect(options.retry).toBe(false);
		expect(options.refetchOnWindowFocus).toBe(false);
		expect(options.refetchOnReconnect).toBe(false);
		expect(options.enabled).toBe(true);
	});

	test('stays idle while no captcha token is set', () => {
		// Backend gates the session-mint endpoint on a verified Turnstile
		// token (audit H1 — card-testing surface). Until the widget issues
		// one, the query must NOT fire — otherwise the broker burns a
		// rate-limited slot on a request that will be 4xx-rejected anyway.
		const options = fanbasisPublicCreditSessionQueryOptions(null);

		expect(options.enabled).toBe(false);
		expect(options.queryKey).toEqual(fanbasisPublicCreditSessionKey(null));
	});
});
