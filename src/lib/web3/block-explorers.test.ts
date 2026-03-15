import { describe, expect, test } from 'bun:test';

import type { CryptoChainConfig } from '@/types/crypto-config';

import {
	getChainName,
	getTxExplorerUrl,
	isValidTxHash,
} from './block-explorers';

/** Valid 66-char tx hash for testing (0x + 64 hex) */
const VALID_TX =
	'0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

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
		explorerTxUrl: 'https://arbiscan.io/tx',
	},
	{
		chainId: 137,
		name: 'Polygon',
		confirmationTarget: 128,
		explorerTxUrl: 'https://polygonscan.com/tx/',
	},
] as CryptoChainConfig[];

describe('isValidTxHash', () => {
	test('accepts valid 0x + 64 hex hashes', () => {
		expect(isValidTxHash(VALID_TX)).toBe(true);
		// Uppercase hex is valid
		expect(isValidTxHash(VALID_TX.toUpperCase())).toBe(true);
	});

	test('rejects short hashes', () => {
		expect(isValidTxHash('0xabc')).toBe(false);
	});

	test('rejects hashes without 0x prefix', () => {
		expect(isValidTxHash(VALID_TX.slice(2))).toBe(false);
	});

	test('rejects non-hex characters', () => {
		expect(
			isValidTxHash(
				'0xzzzzzz1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
			),
		).toBe(false);
	});

	test('rejects empty string', () => {
		expect(isValidTxHash('')).toBe(false);
	});
});

describe('getTxExplorerUrl', () => {
	test('builds full explorer URL for known chains', () => {
		expect(getTxExplorerUrl(VALID_TX, 1, CHAINS)).toBe(
			`https://etherscan.io/tx/${VALID_TX}`,
		);
		expect(getTxExplorerUrl(VALID_TX, 42_161, CHAINS)).toBe(
			`https://arbiscan.io/tx/${VALID_TX}`,
		);
	});

	test('normalizes explorer prefixes with or without trailing slash', () => {
		expect(getTxExplorerUrl(VALID_TX, 137, CHAINS)).toBe(
			`https://polygonscan.com/tx/${VALID_TX}`,
		);
	});

	test('returns null when txHash is undefined', () => {
		expect(getTxExplorerUrl(undefined, 1, CHAINS)).toBeNull();
	});

	test('returns null when chainId is null or undefined', () => {
		expect(getTxExplorerUrl(VALID_TX, null, CHAINS)).toBeNull();
		expect(getTxExplorerUrl(VALID_TX, undefined, CHAINS)).toBeNull();
	});

	test('returns null for unknown chain IDs', () => {
		expect(getTxExplorerUrl(VALID_TX, 99_999, CHAINS)).toBeNull();
	});

	test('returns null for invalid tx hashes (defense-in-depth)', () => {
		expect(getTxExplorerUrl('0xabc', 1, CHAINS)).toBeNull();
		expect(getTxExplorerUrl('javascript:alert(1)', 1, CHAINS)).toBeNull();
		expect(getTxExplorerUrl('../../../etc/passwd', 1, CHAINS)).toBeNull();
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
