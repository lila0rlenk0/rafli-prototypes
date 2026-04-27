import { describe, expect, test } from 'bun:test';

import {
	fanbasisPublicCreditSessionKey,
	fanbasisPublicCreditSessionQueryOptions,
} from './use-fanbasis-public-credit-session';

describe('fanbasisPublicCreditSessionQueryOptions', () => {
	test('reuses the minted Fanbasis session across short navigation hops, never auto-refreshes', () => {
		const options = fanbasisPublicCreditSessionQueryOptions();

		expect(options.queryKey).toEqual(fanbasisPublicCreditSessionKey());
		// 5-minute gcTime — within one tab session, navigating away and back
		// reuses the same minted session instead of hammering the backend broker.
		expect(options.gcTime).toBe(5 * 60 * 1000);
		expect(options.staleTime).toBe(Infinity);
		expect(options.retry).toBe(false);
		expect(options.refetchOnWindowFocus).toBe(false);
		expect(options.refetchOnReconnect).toBe(false);
	});
});
