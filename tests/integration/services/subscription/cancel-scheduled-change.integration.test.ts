import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockDelete = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();
const mockTrackAfter = mock();
const mockRevalidateMySubscription = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock(), delete: mockDelete },
	baseClient: { get: mock() },
}));

mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => Promise.resolve({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mockTrackAfter,
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

mock.module('@/lib/cache/revalidation', () => ({
	revalidateMySubscription: mockRevalidateMySubscription,
	revalidateMyRaffles: mock(),
	revalidateRaffleDetail: mock(),
	revalidateWinningPaths: mock(),
}));

mock.module('@/lib/utils/run-after', () => ({
	runAfter: (task: () => void | Promise<void>) => void task(),
}));

mock.module('@/env/server', () => ({
	env: { APP_URL: 'https://raffly.test' },
}));

const { cancelScheduledChange } = await import(
	'@/services/subscription/cancel-scheduled-change'
);

const VALID_SUBSCRIPTION_ID = '01929e55-9b1a-7c32-8ae0-0123456789ab';
const VALID_PAYLOAD = { subscriptionId: VALID_SUBSCRIPTION_ID };
const VALID_RESPONSE = { status: 'no-pending-change' as const };

describe('cancelScheduledChange', () => {
	test('returns no-pending-change on success', async () => {
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await cancelScheduledChange(VALID_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('no-pending-change');
		}
	});

	test('issues DELETE /subscriptions/:id/scheduled-change', async () => {
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await cancelScheduledChange(VALID_PAYLOAD);

		const lastCall = mockDelete.mock.calls[mockDelete.mock.calls.length - 1];
		const [path] = lastCall ?? [];
		expect(path).toBe(
			`/subscriptions/${VALID_SUBSCRIPTION_ID}/scheduled-change`,
		);
	});

	test('invokes revalidateMySubscription on success', async () => {
		mockRevalidateMySubscription.mockReset();
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await cancelScheduledChange(VALID_PAYLOAD);

		expect(mockRevalidateMySubscription).toHaveBeenCalledTimes(1);
	});

	test('returns VALIDATION_ERROR when subscriptionId is not a UUID', async () => {
		// Client-side payload defects map to `validation_error` rather than the
		// subscription-domain `not-found` URN — a malformed UUID is not a
		// missing row, and the user-facing copy diverges (generic fallback vs.
		// "refresh and try again"). Verified by the in-action `safeParse` short-
		// circuit before any network call lands.
		mockDelete.mockReset();

		const result = await cancelScheduledChange({
			subscriptionId: 'not-a-uuid',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		expect(mockDelete).not.toHaveBeenCalled();
	});

	test('returns FETCH_FAILED on response shape drift', async () => {
		mockCaptureContractDrift.mockReset();
		mockDelete.mockResolvedValueOnce(
			mockAxiosResponse({ wrongField: 'unknown' }),
		);

		const result = await cancelScheduledChange(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps not-found from RFC 7807 response', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:subscription:not-found',
				},
			}),
		);

		const result = await cancelScheduledChange(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.NOT_FOUND);
		}
	});
});
