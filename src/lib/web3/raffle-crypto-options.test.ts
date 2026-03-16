import { describe, expect, test } from 'bun:test';

import type { RaffleCryptoOptions } from '@/types/raffle';

import {
	getSelectableCryptoChains,
	hasSelectableCryptoChains,
} from './raffle-crypto-options';

const CRYPTO_OPTIONS: RaffleCryptoOptions = {
	chains: [
		{
			chainId: 1,
			name: 'Ethereum',
			tokens: [
				{
					tokenId: 'usdc',
					symbol: 'USDC',
					price: null,
					address: '0x0000000000000000000000000000000000000001',
					decimals: 6,
					isStablecoin: true,
				},
			],
		},
		{
			chainId: 42_161,
			name: 'Arbitrum',
			tokens: [],
		},
		{
			chainId: 84_532,
			name: 'Base Sepolia',
			tokens: [
				{
					tokenId: 'earnm',
					symbol: 'EARNM',
					price: '1.23',
					address: '0x0000000000000000000000000000000000000002',
					decimals: 18,
					isStablecoin: false,
				},
			],
		},
	],
};

describe('getSelectableCryptoChains', () => {
	test('keeps only FE-supported chains that still have selectable tokens', () => {
		expect(getSelectableCryptoChains(CRYPTO_OPTIONS, [1, 42_161])).toEqual([
			CRYPTO_OPTIONS.chains[0]!,
		]);
	});

	test('returns empty array when no selectable chain survives', () => {
		expect(getSelectableCryptoChains(CRYPTO_OPTIONS, [42_161])).toEqual([]);
		expect(getSelectableCryptoChains(null, [1])).toEqual([]);
	});
});

describe('hasSelectableCryptoChains', () => {
	test('returns true only when at least one selectable chain remains', () => {
		expect(hasSelectableCryptoChains(CRYPTO_OPTIONS, [1])).toBe(true);
		expect(hasSelectableCryptoChains(CRYPTO_OPTIONS, [42_161])).toBe(false);
	});
});
