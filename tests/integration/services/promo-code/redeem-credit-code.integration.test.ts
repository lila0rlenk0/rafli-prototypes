import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { PROMO_CODE_ERROR_CODES } from '@/types/errors/promo-code-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

// Module-level mocks must register BEFORE the server action imports — Bun's
// `mock.module()` is process-global and resolves on first `import()`.
const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost, delete: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All event exports required — incomplete mocks contaminate other test files
// via Bun's global mock.module() (see redeem-promo-code.integration.test.ts).
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files.
mock.module('@/lib/auth/session', () => ({
	getSession: () => null,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/utils/run-after', () => ({
	runAfter: (fn: () => void) => void fn(),
}));
// `revalidatePath` is a Next.js server-only call — stub so the action runs in
// the Bun test environment without bringing in the runtime.
mock.module('next/cache', () => ({
	revalidatePath: mock(),
	revalidateTag: mock(),
}));

const { redeemCreditCode } = await import(
	'@/services/promo-code/redeem-credit-code'
);

describe('redeemCreditCode', () => {
	test('returns redemption details on credit_grant success', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				redemptionId: 'redeem-credit-1',
				type: 'credit_grant',
				creditsGranted: '25.0000',
				balanceAfter: '125.0000',
			}),
		);

		const result = await redeemCreditCode({ code: 'AB23-CD45' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.redemptionId).toBe('redeem-credit-1');
			expect(result.data.type).toBe('credit_grant');
			expect(result.data.creditsGranted).toBe('25.0000');
			expect(result.data.balanceAfter).toBe('125.0000');
		}
	});

	test('returns FETCH_FAILED on invalid code format — fails before network', async () => {
		// Underscore is outside the bearer-token charset ([A-Z0-9-]) the BE
		// validator accepts — even after the FE preprocessor upper-cases the
		// input, the charset refine still rejects it. safeParse fails so the
		// action short-circuits without calling the API.
		const result = await redeemCreditCode({ code: 'BAD_CODE_X' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('returns FETCH_FAILED when BE returns a non-credit_grant type', async () => {
		// Response schema locks `type: 'credit_grant'` — a `free_tickets` payload
		// reaching this endpoint means a host-scoped raffle code was redeemed via
		// the wrong action. Surface as ContractDrift, not as silent success.
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				redemptionId: 'redeem-credit-2',
				type: 'free_tickets',
				ticketsGranted: 1,
			}),
		);

		const result = await redeemCreditCode({ code: 'AB23-CD45' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps already-redeemed RFC 7807 to ALREADY_REDEEMED', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: { type: 'urn:raffles:problem:core:promo:already-redeemed' },
			}),
		);

		const result = await redeemCreditCode({ code: 'AB23-CD45' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.ALREADY_REDEEMED);
		}
	});

	test('maps not-found RFC 7807 to NOT_FOUND', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:core:promo:not-found' },
			}),
		);

		const result = await redeemCreditCode({ code: 'AB23-CD45' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.NOT_FOUND);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await redeemCreditCode({ code: 'AB23-CD45' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
