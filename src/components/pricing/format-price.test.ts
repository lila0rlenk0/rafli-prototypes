import { describe, expect, test } from 'bun:test';

import { formatPrice } from './format-price';

describe('formatPrice', () => {
	test('strips trailing zeros on integer amounts', () => {
		// Backend serialises decimals with 4 digits of precision for storage
		// exactness; the UI should not leak "25.0000" to the user.
		expect(formatPrice('25.0000')).toBe('$25');
		expect(formatPrice('100.0000')).toBe('$100');
	});

	test('preserves cents when present', () => {
		expect(formatPrice('29.9900')).toBe('$29.99');
		expect(formatPrice('9.5000')).toBe('$9.50');
	});

	test('falls back to the raw string on non-numeric input', () => {
		// Better to render the raw wire value than a locale-specific "NaN"
		// token — surface is recoverable with a reload, NaN is not.
		expect(formatPrice('not-a-number')).toBe('not-a-number');
	});
});
