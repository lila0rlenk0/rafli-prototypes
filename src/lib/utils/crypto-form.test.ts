import { describe, expect, test } from 'bun:test';

import type { RaffleCryptoOptions } from '@/types/raffle';

import { extractCryptoFormFields, getCryptoSummary } from './crypto-form';

// Fixture: multi-chain crypto options with stablecoin and non-stablecoin tokens
const CRYPTO_OPTIONS: RaffleCryptoOptions = {
	chains: [
		{
			chainId: 137,
			name: 'Polygon',
			tokens: [
				{
					tokenId: 'usdc',
					symbol: 'USDC',
					price: null,
					address: '0xUSDC',
					decimals: 6,
					isStablecoin: true,
				},
				{
					tokenId: 'earnm',
					symbol: 'EARNM',
					price: '50.5',
					address: '0xEARNM',
					decimals: 18,
					isStablecoin: false,
				},
			],
		},
		{
			chainId: 42_161,
			name: 'Arbitrum',
			tokens: [
				{
					tokenId: 'usdc',
					symbol: 'USDC',
					price: null,
					address: '0xUSDC_ARB',
					decimals: 6,
					isStablecoin: true,
				},
				{
					tokenId: 'earnm',
					symbol: 'EARNM',
					price: '50.5',
					address: '0xEARNM_ARB',
					decimals: 18,
					isStablecoin: false,
				},
			],
		},
	],
};

describe('extractCryptoFormFields', () => {
	describe('null input', () => {
		test('returns disabled crypto fields when null', () => {
			const result = extractCryptoFormFields(null);
			expect(result).toEqual({
				acceptsCrypto: false,
				cryptoChainIds: [],
				cryptoTokens: [],
				cryptoTokenPricing: [],
			});
		});
	});

	describe('valid crypto options', () => {
		test('sets acceptsCrypto to true', () => {
			const result = extractCryptoFormFields(CRYPTO_OPTIONS);
			expect(result.acceptsCrypto).toBe(true);
		});

		test('extracts chain IDs', () => {
			const result = extractCryptoFormFields(CRYPTO_OPTIONS);
			expect(result.cryptoChainIds).toEqual([137, 42_161]);
		});

		test('deduplicates token IDs across chains', () => {
			const result = extractCryptoFormFields(CRYPTO_OPTIONS);
			// usdc appears in both chains but should be deduplicated
			expect(result.cryptoTokens).toEqual(['usdc', 'earnm']);
		});

		test('extracts non-stablecoin pricing deduplicated by tokenId', () => {
			const result = extractCryptoFormFields(CRYPTO_OPTIONS);
			// earnm appears on both chains but only one pricing entry
			expect(result.cryptoTokenPricing).toEqual([
				{ tokenId: 'earnm', price: '50.5' },
			]);
		});

		test('excludes stablecoins from pricing', () => {
			const result = extractCryptoFormFields(CRYPTO_OPTIONS);
			const hasStablecoinPricing = result.cryptoTokenPricing.some(
				entry => entry.tokenId === 'usdc',
			);
			expect(hasStablecoinPricing).toBe(false);
		});
	});

	describe('single chain', () => {
		test('handles single chain with only stablecoins', () => {
			const options: RaffleCryptoOptions = {
				chains: [
					{
						chainId: 1,
						name: 'Ethereum',
						tokens: [
							{
								tokenId: 'usdc',
								symbol: 'USDC',
								price: null,
								address: '0x1',
								decimals: 6,
								isStablecoin: true,
							},
						],
					},
				],
			};
			const result = extractCryptoFormFields(options);
			expect(result.cryptoChainIds).toEqual([1]);
			expect(result.cryptoTokens).toEqual(['usdc']);
			// No non-stablecoin tokens — pricing empty
			expect(result.cryptoTokenPricing).toEqual([]);
		});
	});
});

describe('getCryptoSummary', () => {
	describe('crypto disabled', () => {
		test('returns "Card only" when acceptsCrypto is false', () => {
			expect(getCryptoSummary(false, [], [])).toBe('Card only');
		});
	});

	describe('partial selection', () => {
		test('shows chain and token counts', () => {
			const result = getCryptoSummary(true, [137, 42_161], ['usdc', 'earnm']);
			expect(result).toBe('2 chain(s) \u00B7 2 token(s)');
		});

		test('shows 1 chain 1 token', () => {
			const result = getCryptoSummary(true, [137], ['usdc']);
			expect(result).toBe('1 chain(s) \u00B7 1 token(s)');
		});
	});

	describe('all selected', () => {
		test('shows "All chains" when count matches total', () => {
			const result = getCryptoSummary(true, [137, 42_161], ['usdc'], 2, 3);
			expect(result).toBe('All chains \u00B7 1 token(s)');
		});

		test('shows "All tokens" when count matches total', () => {
			const result = getCryptoSummary(true, [137], ['usdc', 'earnm'], 3, 2);
			expect(result).toBe('1 chain(s) \u00B7 All tokens');
		});

		test('shows both "All" when all match totals', () => {
			const result = getCryptoSummary(
				true,
				[137, 42_161],
				['usdc', 'earnm'],
				2,
				2,
			);
			expect(result).toBe('All chains \u00B7 All tokens');
		});
	});

	describe('no totals provided', () => {
		test('falls back to count format when totals undefined', () => {
			const result = getCryptoSummary(true, [137], ['usdc']);
			expect(result).toBe('1 chain(s) \u00B7 1 token(s)');
		});
	});
});
