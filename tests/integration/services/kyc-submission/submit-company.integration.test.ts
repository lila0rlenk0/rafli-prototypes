import { describe, expect, mock, spyOn, test } from 'bun:test';

import { COMMON_ERROR_CODES, KYC_SUBMISSION_ERROR_CODES } from '@/types/errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

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

const { submitCompany } = await import(
	'@/services/kyc-submission/submit-company'
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Valid input matching kybCompanyInputSchema */
function validInput() {
	return {
		legalEntityName: 'Acme Corp',
		businessRegistrationNumber: 'REG-12345',
		countryOfIncorporation: 'US',
		contactPersonName: 'Jane Doe',
		contactEmail: 'jane@acme.com',
	};
}

const VALID_RESPONSE = {
	id: 'sub-2',
	type: 'kyb_company',
	status: 'pending',
	submittedAt: '2026-04-02T12:00:00Z',
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('submitCompany', () => {
	describe('input validation', () => {
		test('returns validation_error for null input', async () => {
			const result = await submitCompany(null as never);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
			expect(mockPost).not.toHaveBeenCalled();
		});

		test('returns validation_error for empty object', async () => {
			const result = await submitCompany({} as never);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
			expect(mockPost).not.toHaveBeenCalled();
		});

		test('returns validation_error for invalid email', async () => {
			const result = await submitCompany({
				...validInput(),
				contactEmail: 'not-an-email',
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

			const result = await submitCompany(validInput());

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('sub-2');
				expect(result.data.status).toBe('pending');
			}
		});

		test('sends validated data to correct endpoint', async () => {
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

			await submitCompany(validInput());

			expect(mockPost).toHaveBeenCalledWith(
				'/verification/kyb-company',
				expect.objectContaining({ legalEntityName: 'Acme Corp' }),
				expect.any(Object),
			);
		});
	});

	describe('backend errors', () => {
		test('maps RFC 7807 already-pending error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 409,
					data: {
						type: 'urn:raffles:problem:core:verification:already-pending',
					},
				}),
			);

			const result = await submitCompany(validInput());

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('core:verification:already-pending');
			}
		});
	});

	describe('response validation', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			const consoleSpy = spyOn(console, 'error').mockImplementation(
				() => {},
			);
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await submitCompany(validInput());

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(
					KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED,
				);
			}
			consoleSpy.mockRestore();
		});
	});
});
