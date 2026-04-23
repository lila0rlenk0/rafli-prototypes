import { describe, expect, test } from 'bun:test';

import { winnerFormSchema } from './form-schema';

/**
 * Base winner form fixture with every required shipping field populated. KYC
 * shipping is mandatory (physical follow-ups for any prize class), so tests
 * start from a valid payload and negate specific fields to probe the guards.
 */
function baseWinnerForm() {
	const placeholderFile = new File(['x'], 'id.png', { type: 'image/png' });
	return {
		verificationType: 'kyc_winner' as const,
		fullLegalName: 'Lucky Winner',
		dateOfBirth: '1995-06-15',
		countryOfResidence: 'US',
		identityDocType: 'passport' as const,
		bankAccountOrWallet: '',
		shippingName: 'Lucky Winner',
		shippingStreet: '123 Main St',
		shippingCity: 'Austin',
		shippingZip: '73301',
		shippingCountry: 'US',
		shippingPhone: '',
		idFront: [placeholderFile],
		idBack: [],
	};
}

describe('winnerFormSchema required shipping address', () => {
	test('accepts a fully populated shipping block', () => {
		const result = winnerFormSchema.safeParse(baseWinnerForm());
		expect(result.success).toBe(true);
	});

	test('accepts fully populated shipping with optional phone', () => {
		const result = winnerFormSchema.safeParse({
			...baseWinnerForm(),
			shippingPhone: '+1 555 010 0000',
		});
		expect(result.success).toBe(true);
	});

	test('rejects missing shipping fields with per-field errors on every empty required field', () => {
		// Every required shipping component absent — the schema must raise an issue
		// on each so the UI surfaces all gaps at once, matching the prior all-or-none
		// behavior but now enforced as an absolute requirement instead of conditional.
		const result = winnerFormSchema.safeParse({
			...baseWinnerForm(),
			shippingName: '',
			shippingStreet: '',
			shippingCity: '',
			shippingZip: '',
			shippingCountry: '',
		});
		expect(result.success).toBe(false);
		if (result.success) return;

		const emptyRequiredFields = [
			'shippingName',
			'shippingStreet',
			'shippingCity',
			'shippingZip',
			'shippingCountry',
		];
		const flagged = new Set(
			result.error.issues.map(issue => issue.path.join('.')),
		);
		for (const field of emptyRequiredFields) {
			expect(flagged.has(field)).toBe(true);
		}
	});

	test('rejects a partial shipping block — only name filled', () => {
		// Partial inputs fail per missing field so the user fixes every gap in one
		// pass rather than bouncing between errors on repeated submits.
		const result = winnerFormSchema.safeParse({
			...baseWinnerForm(),
			shippingStreet: '',
			shippingCity: '',
			shippingZip: '',
			shippingCountry: '',
		});
		expect(result.success).toBe(false);
		if (result.success) return;

		const flagged = new Set(
			result.error.issues.map(issue => issue.path.join('.')),
		);
		for (const field of [
			'shippingStreet',
			'shippingCity',
			'shippingZip',
			'shippingCountry',
		]) {
			expect(flagged.has(field)).toBe(true);
		}
		expect(flagged.has('shippingName')).toBe(false);
	});
});
