import { describe, expect, mock, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockBaseGet = mock();
const mockCaptureServiceError = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mockBaseGet },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));

const { getCryptoConfig } = await import(
	'@/services/payment/get-crypto-config'
);

/** Valid response matching cryptoConfigSchema */
const VALID_RESPONSE = {
	chains: [
		{
			chainId: 42161,
			confirmationTarget: 12,
			explorerTxUrl: 'https://arbiscan.io/tx',
			name: 'Arbitrum One',
			tokens: [
				{
					address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
					decimals: 6,
					isStablecoin: true,
					name: 'USD Coin',
					symbol: 'USDC',
					tokenId: 'usdc',
				},
			],
		},
	],
};

describe('getCryptoConfig', () => {
	test('returns validated crypto config on valid response', async () => {
		mockBaseGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getCryptoConfig();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.chains).toHaveLength(1);
			expect(result.data.chains[0].chainId).toBe(42161);
			expect(result.data.chains[0].tokens[0].symbol).toBe('USDC');
		}
	});

	test('handles multiple chains with multiple tokens', async () => {
		const multiChainResponse = {
			chains: [
				...VALID_RESPONSE.chains,
				{
					chainId: 1,
					confirmationTarget: 64,
					explorerTxUrl: 'https://etherscan.io/tx',
					name: 'Ethereum',
					tokens: [
						{
							address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
							decimals: 6,
							isStablecoin: true,
							name: 'Tether USD',
							symbol: 'USDT',
							tokenId: 'usdt',
						},
					],
				},
			],
		};
		mockBaseGet.mockResolvedValueOnce(
			mockAxiosResponse(multiChainResponse),
		);

		const result = await getCryptoConfig();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.chains).toHaveLength(2);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Missing `chains` array — Zod parse fails
		mockBaseGet.mockResolvedValueOnce(
			mockAxiosResponse({ networks: [] }),
		);

		const result = await getCryptoConfig();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('returns FETCH_FAILED on invalid token shape', async () => {
		// Missing required token fields — Zod parse fails
		const invalidResponse = {
			chains: [
				{
					...VALID_RESPONSE.chains[0],
					tokens: [{ address: '0xabc' }],
				},
			],
		};
		mockBaseGet.mockResolvedValueOnce(
			mockAxiosResponse(invalidResponse),
		);

		const result = await getCryptoConfig();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockBaseGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getCryptoConfig();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockBaseGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await getCryptoConfig();

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockBaseGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await getCryptoConfig();

		expect(result.success).toBe(false);
	});
});
