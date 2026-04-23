import { afterAll, describe, expect, mock, test } from 'bun:test';

import { hashPromoCodeForAnalytics } from '@/lib/analytics/hash-sensitive';

// Capture real `session` function refs in the body (below) *before* the
// `mock.module('@/lib/auth/session', …)` call. The static `import` is
// hoisted, but the snapshot const runs after the real module is linked and
// before the mock. Bun’s module mock is process-wide; the alias mock would
// otherwise break later test files (e.g. `verify-bearer-cookies`) that need
// the on-disk `setAuthCookies` chain.
import * as preMockSession from '@/lib/auth/session';

import { mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

const realSessionForRestore = {
	setAuthCookies: preMockSession.setAuthCookies,
	getAuthToken: preMockSession.getAuthToken,
	getSession: preMockSession.getSession,
	getCurrentUser: preMockSession.getCurrentUser,
	requireAuth: preMockSession.requireAuth,
	requireEmailVerification: preMockSession.requireEmailVerification,
} as const;

const mockPost = mock();
const mockTrackServer = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost, delete: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mockTrackServer,
}));
mock.module('@/lib/auth/session', () => ({
	getSession: () => null,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

afterAll(() => {
	mock.module('@/lib/auth/session', () => ({ ...realSessionForRestore }));
});

const { validatePromoCode } =
	await import('@/services/promo-code/validate-promo-code');

describe('validatePromoCode analytics (VALIDATED)', () => {
	test('sends code_fingerprint to Mixpanel, not plaintext code', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				valid: true,
				type: 'free_tickets',
				ticketsGranted: 1,
			}),
		);

		const codeInput = 'ab23-cd45';
		const normalized = 'AB23-CD45';
		await validatePromoCode('raffle-1', codeInput);
		// `void sessionPromise.then(trackServer)` — flush microtask after the action returns
		await Promise.resolve();
		await Promise.resolve();

		expect(mockTrackServer).toHaveBeenCalledTimes(1);
		const [eventName, props] = mockTrackServer.mock.calls[0] as [
			string,
			Record<string, unknown>,
		];
		expect(eventName).toBe(MOCK_ANALYTICS_EVENTS.PROMO_CODE_EVENTS.VALIDATED);
		expect(props).toMatchObject({
			raffle_id: 'raffle-1',
			valid: true,
		});
		expect(props.code_fingerprint).toBe(hashPromoCodeForAnalytics(normalized));
		expect('code' in props).toBe(false);
	});
});
