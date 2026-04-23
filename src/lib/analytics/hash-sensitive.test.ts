import { describe, expect, test } from 'bun:test';

import { hashPromoCodeForAnalytics } from './hash-sensitive';

describe('hashPromoCodeForAnalytics (promo plaintext in analytics mitigated)', () => {
	test('stable short fingerprint, not reversible from hash alone', () => {
		expect(hashPromoCodeForAnalytics('SAVE20')).toBe(
			hashPromoCodeForAnalytics('SAVE20'),
		);
		expect(hashPromoCodeForAnalytics('SAVE20')).not.toContain('SAVE');
	});
});
