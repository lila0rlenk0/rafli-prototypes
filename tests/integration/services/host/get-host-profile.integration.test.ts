import { describe, expect, mock, test } from 'bun:test';

import { HOST_ERROR_CODES } from '@/types/errors/host-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { HostProfile } from '@/types/host';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

/** Minimal valid host profile */
const VALID_PROFILE: HostProfile = {
	id: '550e8400-e29b-71d4-a716-446655440000',
	name: 'Test Host',
	username: 'testhost',
	bio: 'A test host bio',
	image: null,
	averageRating: 4.5,
	totalRafflesHosted: 10,
	totalReviews: 5,
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mockGet },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getHostProfile } = await import('@/services/host/get-host-profile');

describe('getHostProfile', () => {
	test('returns validated host profile on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_PROFILE));

		const result = await getHostProfile('testhost');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.username).toBe('testhost');
			expect(result.data.totalRafflesHosted).toBe(10);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ id: 123 }));

		const result = await getHostProfile('testhost');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(HOST_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps not-found from RFC 7807', async () => {
		// Public profile endpoint lives in the backend auth service — its 404 URN
		// is `auth:profile:not-found` (see get-user-profile.query.ts), which is
		// exactly the wire code `HOST_ERROR_CODES.NOT_FOUND` re-exports so the
		// `/host/[username]` page can branch on it to call Next's `notFound()`.
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:auth:profile:not-found' },
			}),
		);

		const result = await getHostProfile('nonexistent');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(HOST_ERROR_CODES.NOT_FOUND);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getHostProfile('testhost');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getHostProfile('testhost');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
