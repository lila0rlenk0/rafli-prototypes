import { describe, expect, mock, test } from 'bun:test';

import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockDelete = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();
const mockTrackAfter = mock();
const mockRevalidateMySubscription = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	// `post` stays mocked even though `cancelSubscription` no longer hits it —
	// `mock.module()` is process-wide, so omitting `post` would null the
	// authenticatedClient.post that sibling actions read on the same module.
	authenticatedClient: { get: mock(), post: mock(), delete: mockDelete },
	baseClient: { get: mock() },
}));

// Bun's `mock.module()` caches module exports — partial mocks contaminate
// sibling actions that import the same module. Match the production
// surface exactly even for unused functions.
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

const { cancelSubscription } = await import(
	'@/services/subscription/cancel-subscription'
);

const VALID_SUBSCRIPTION_ID = '01929e55-9b1a-7c32-8ae0-0123456789ab';
const VALID_PAYLOAD = { subscriptionId: VALID_SUBSCRIPTION_ID };
const VALID_RESPONSE = {
	expiresAt: '2026-05-29T00:00:00.000Z',
	status: 'cancelled' as const,
};

describe('cancelSubscription', () => {
	test('returns expiresAt + status on success', async () => {
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await cancelSubscription(VALID_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.expiresAt).toBe(VALID_RESPONSE.expiresAt);
			expect(result.data.status).toBe(VALID_RESPONSE.status);
		}
	});

	test('issues DELETE with subscriptionId on the path, no body', async () => {
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await cancelSubscription(VALID_PAYLOAD);

		const lastCall = mockDelete.mock.calls[mockDelete.mock.calls.length - 1];
		const [path, config] = lastCall ?? [];
		// Subscription id is encoded into the URL — the action calls
		// `encodeURIComponent` even though the local UUID validation already
		// rejects anything outside `[0-9a-f-]`, so the rule "never interpolate
		// raw values into URLs" reads cleanly at the call site.
		expect(path).toBe(`/subscriptions/${VALID_SUBSCRIPTION_ID}`);
		// Axios `delete(url, config?)` — no body argument; the config is
		// passed in slot 2 and only carries the per-call timeout override.
		expect(config).toBeDefined();
	});

	test('invokes revalidateMySubscription on success', async () => {
		mockRevalidateMySubscription.mockReset();
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await cancelSubscription(VALID_PAYLOAD);

		expect(mockRevalidateMySubscription).toHaveBeenCalledTimes(1);
	});

	test('returns NOT_FOUND when subscriptionId is not a UUID', async () => {
		// Bad UUID — safeParse fails, no network call made.
		mockDelete.mockReset();

		const result = await cancelSubscription({ subscriptionId: 'not-a-uuid' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.NOT_FOUND);
		}
		expect(mockDelete).not.toHaveBeenCalled();
	});

	test('returns FETCH_FAILED on response shape drift', async () => {
		mockCaptureContractDrift.mockReset();
		mockDelete.mockResolvedValueOnce(
			mockAxiosResponse({ wrongField: 'whatever' }),
		);

		const result = await cancelSubscription(VALID_PAYLOAD);

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

		const result = await cancelSubscription(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.NOT_FOUND);
		}
	});

	test('maps not-active from RFC 7807 response', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: {
					type: 'urn:raffles:problem:payments:subscription:not-active',
				},
			}),
		);

		const result = await cancelSubscription(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.NOT_ACTIVE);
		}
	});

	test('maps unauthenticated to global:auth:unauthenticated', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await cancelSubscription(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockDelete.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await cancelSubscription(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error', async () => {
		mockDelete.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await cancelSubscription(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
