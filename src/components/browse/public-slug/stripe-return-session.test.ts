import { describe, expect, test } from 'bun:test';

import { resolveStripeReturnSessionId } from './stripe-return-session';

describe('resolveStripeReturnSessionId (Referer / session_id leak mitigated)', () => {
	test('prefers captured id after URL strip', () => {
		expect(resolveStripeReturnSessionId('cs_keep', undefined)).toBe('cs_keep');
	});

	test('uses search param when not yet captured', () => {
		expect(resolveStripeReturnSessionId(null, 'cs_from_url')).toBe(
			'cs_from_url',
		);
	});
});
