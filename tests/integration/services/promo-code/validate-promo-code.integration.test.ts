import { describe, expect, mock, test } from 'bun:test';

import { hashPromoCodeForAnalytics } from '@/lib/analytics/hash-sensitive';
import { PROMO_CODE_ERROR_CODES } from '@/types/errors/promo-code-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

const mockPost = mock();
const mockTrackAfter = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost, delete: mock() },
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
	trackAfter: mockTrackAfter,
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

const { validatePromoCode } = await import(
	'@/services/promo-code/validate-promo-code'
);

describe('validatePromoCode', () => {
	test('returns validated response for free_tickets code', async () => {
		// `rawValue` mirrors BE `promoCode.value` — added to ValidatePromoCodeResponse
		// so FE can run subscriber-aware order-level math without trusting the
		// per-ticket-capped preview (see types/promo-code.ts).
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				valid: true,
				type: 'free_tickets',
				ticketsGranted: 3,
				rawValue: '3',
			}),
		);

		const result = await validatePromoCode('raffle-1', 'AB23-CD45');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.valid).toBe(true);
			expect(result.data.ticketsGranted).toBe(3);
		}
	});

	test('returns INVALID_CODE for malformed code format', async () => {
		// PROMO_CODE_REGEX expects XXXX-XXXX format — early rejection, no API call
		const result = await validatePromoCode('raffle-1', 'bad-format');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.INVALID_CODE);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await validatePromoCode('raffle-1', 'AB23-CD45');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps expired from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:promo:expired' },
			}),
		);

		const result = await validatePromoCode('raffle-1', 'AB23-CD45');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.EXPIRED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await validatePromoCode('raffle-1', 'AB23-CD45');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('analytics: sends code_fingerprint to Mixpanel, never plaintext code', async () => {
		// Privacy: the raw promo code is sensitive (host-shared, may identify
		// the user via redemption history). Mixpanel only ever sees the SHA-256
		// fingerprint via `hashPromoCodeForAnalytics`.
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				valid: true,
				type: 'free_tickets',
				ticketsGranted: 1,
				rawValue: '1',
			}),
		);
		mockTrackAfter.mockClear();

		const codeInput = 'ab23-cd45';
		const normalized = 'AB23-CD45';
		await validatePromoCode('raffle-1', codeInput);

		expect(mockTrackAfter).toHaveBeenCalledTimes(1);
		const [eventName, props] = mockTrackAfter.mock.calls[0] as [
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
