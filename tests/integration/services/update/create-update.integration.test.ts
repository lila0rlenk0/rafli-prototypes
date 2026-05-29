import { describe, expect, mock, test } from 'bun:test';

import { UPDATE_ERROR_CODES } from '@/types/errors/update-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { Update } from '@/types/update';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

const VALID_UPDATE: Update = {
	id: 'update-1',
	raffleId: 'raffle-1',
	text: 'Exciting news about the raffle!',
	imageUrls: [],
	host: { id: 'host-1', name: 'Host Name', avatar: null },
	createdAt: '2026-01-01T00:00:00Z',
};

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All event exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: () => null,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

const { createUpdate } = await import('@/services/update/create-update');

describe('createUpdate', () => {
	test('returns validated update on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_UPDATE));

		const result = await createUpdate('raffle-1', {
			text: 'Exciting news about the raffle!',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe('update-1');
			expect(result.data.text).toBe('Exciting news about the raffle!');
		}
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await createUpdate('raffle-1', { text: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps permission-denied from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: { type: 'urn:raffles:problem:core:update:permission-denied' },
			}),
		);

		const result = await createUpdate('raffle-1', { text: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(UPDATE_ERROR_CODES.PERMISSION_DENIED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await createUpdate('raffle-1', { text: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createUpdate('raffle-1', { text: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
