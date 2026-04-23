import { describe, expect, test } from 'bun:test';

import { mapPolledCryptoFailureReasonToUserMessage } from './error-messages';

describe('mapPolledCryptoFailureReasonToUserMessage', () => {
	test('unknown reason uses fallback', () => {
		expect(
			mapPolledCryptoFailureReasonToUserMessage(
				'postgres error at line 99',
				'fallback',
			),
		).toBe('fallback');
	});
});
