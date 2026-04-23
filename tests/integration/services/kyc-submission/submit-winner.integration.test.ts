import { describe, expect, mock, spyOn, test } from 'bun:test';

import { COMMON_ERROR_CODES, KYC_SUBMISSION_ERROR_CODES } from '@/types/errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// ─── Mock Dependencies ───────────────────────────────────────────────────────

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mock(),
		post: mockPost,
		patch: mock(),
	},
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { submitWinner } =
	await import('@/services/kyc-submission/submit-winner');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Valid input matching kycWinnerInputSchema */
function validInput() {
	return {
		fullLegalName: 'Alice Winner',
		dateOfBirth: '1995-06-15',
		countryOfResidence: 'US',
		identityDocType: 'passport' as const,
		bankAccountOrWallet: null,
		shippingAddress: {
			name: 'Alice Winner',
			address: '456 Oak Ave',
			city: 'Los Angeles',
			zip: '90001',
			country: 'US',
			phone: null,
		},
	};
}

const VALID_RESPONSE = {
	id: 'sub-3',
	type: 'kyc_winner',
	status: 'pending',
	submittedAt: '2026-04-02T12:00:00Z',
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('submitWinner', () => {
	describe('input validation', () => {
		test('returns validation_error for null input', async () => {
			const result = await submitWinner(null as never);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
			expect(mockPost).not.toHaveBeenCalled();
		});

		test('returns validation_error for empty object', async () => {
			const result = await submitWinner({} as never);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
			expect(mockPost).not.toHaveBeenCalled();
		});

		test('returns validation_error for invalid identityDocType', async () => {
			const result = await submitWinner({
				...validInput(),
				identityDocType: 'invalid',
			} as never);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
			expect(mockPost).not.toHaveBeenCalled();
		});

		test('returns validation_error for partial shippingAddress missing required fields', async () => {
			// Zod rejects any incomplete structured shipping — the backend
			// awaiting_host DB CHECK requires every field present, so wire-level
			// validation must block half-filled payloads before they reach the API.
			const result = await submitWinner({
				...validInput(),
				shippingAddress: { address: 'x', city: 'y' },
			} as never);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
			expect(mockPost).not.toHaveBeenCalled();
		});
	});

	describe('successful submission', () => {
		test('returns parsed response on valid input', async () => {
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

			const result = await submitWinner(validInput());

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('sub-3');
				expect(result.data.status).toBe('pending');
			}
		});

		test('sends validated data to correct endpoint', async () => {
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

			await submitWinner(validInput());

			expect(mockPost).toHaveBeenCalledWith(
				'/verification/kyc-winner',
				expect.objectContaining({ fullLegalName: 'Alice Winner' }),
				expect.any(Object),
			);
		});

		test('accepts null shippingAddress for wallet-only claimants', async () => {
			// Monetary / digital prizes submit null shipping — the backend writes
			// `shippingAddress: null` and winnings remain in the manual claim path
			// until KYC-winner approval flips on structured shipping from this form.
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

			const result = await submitWinner({
				...validInput(),
				shippingAddress: null,
			});

			expect(result.success).toBe(true);
			expect(mockPost).toHaveBeenCalledWith(
				'/verification/kyc-winner',
				expect.objectContaining({ shippingAddress: null }),
				expect.any(Object),
			);
		});
	});

	describe('backend errors', () => {
		test('maps network error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await submitWinner(validInput());

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});
	});

	describe('response validation', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
			mockPost.mockResolvedValueOnce(mockAxiosResponse({ invalid: true }));

			const result = await submitWinner(validInput());

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
			}
			consoleSpy.mockRestore();
		});
	});
});
