import { describe, expect, test } from 'bun:test';

import {
	fanbasisPublicCreditSessionKey,
	fanbasisPublicCreditSessionQueryOptions,
} from './use-fanbasis-public-credit-session';

describe('fanbasisPublicCreditSessionQueryOptions', () => {
	test('mints a fresh Fanbasis session on each subscribe-page mount', () => {
		const options = fanbasisPublicCreditSessionQueryOptions();

		expect(options.queryKey).toEqual(fanbasisPublicCreditSessionKey());
		expect(options.gcTime).toBe(0);
		expect(options.refetchOnMount).toBe('always');
		expect(options.retry).toBe(false);
		expect(options.refetchOnWindowFocus).toBe(false);
		expect(options.refetchOnReconnect).toBe(false);
	});
});
