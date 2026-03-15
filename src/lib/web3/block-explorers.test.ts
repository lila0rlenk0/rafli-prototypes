import { describe, expect, test } from 'bun:test';

import type { CryptoChainConfig } from '@/types/crypto-config';

import { getChainName, getTxExplorerUrl } from './block-explorers';

/** Minimal chain configs for testing */
const CHAINS: CryptoChainConfig[] = [
	{
		chainId: 1,
		name: 'Ethereum',
		confirmationTarget: 12,
		explorerTxUrl: 'https://etherscan.io/tx/',
	},
	{
		chainId: 42_161,
		name: 'Arbitrum',
		confirmationTarget: 1,
		explorerTxUrl: 'https://arbiscan.io/tx/',
	},
	{
		chainId: 137,
		name: 'Polygon',
		confirmationTarget: 128,
		explorerTxUrl: 'https://polygonscan.com/tx/',
	},
] as CryptoChainConfig[];

describe('getTxExplorerUrl', () => {
	test('builds full explorer URL for known chains', () => {
		expect(getTxExplorerUrl('0xabc', 1, CHAINS)).toBe(
			'https://etherscan.io/tx/0xabc',
		);
		expect(getTxExplorerUrl('0xdef', 42_161, CHAINS)).toBe(
			'https://arbiscan.io/tx/0xdef',
		);
	});

	test('returns null when txHash is undefined', () => {
		expect(getTxExplorerUrl(undefined, 1, CHAINS)).toBeNull();
	});

	test('returns null when chainId is null or undefined', () => {
		expect(getTxExplorerUrl('0xabc', null, CHAINS)).toBeNull();
		expect(getTxExplorerUrl('0xabc', undefined, CHAINS)).toBeNull();
	});

	test('returns null for unknown chain IDs', () => {
		expect(getTxExplorerUrl('0xabc', 99_999, CHAINS)).toBeNull();
	});
});

describe('getChainName', () => {
	test('returns chain name from config', () => {
		expect(getChainName(1, CHAINS)).toBe('Ethereum');
		expect(getChainName(137, CHAINS)).toBe('Polygon');
	});

	test('returns fallback for unknown chains', () => {
		expect(getChainName(99_999, CHAINS)).toBe('Chain 99999');
	});
});
