import { describe, expect, test } from 'bun:test';
import { getAddress, zeroAddress } from 'viem';

import type { RaffleCryptoOptions, RaffleCryptoToken } from '@/types/raffle';

import {
	buildRecoveredCheckoutToken,
	type BuildRecoveredTokenArgs,
} from './checkout-session-token';

// ==========================================
// Module-scope fixtures
// ==========================================

/** Realistic ERC20 address — distinct from zeroAddress so we can detect synth fallbacks. */
const USDC_ADDR = getAddress('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
const EARNM_ADDR = getAddress('0x0000000000000000000000000000000000001234');

/** Chain used by every fixture — Base mainnet as a plausible recovery target. */
const CHAIN_ID = 8_453;
/** Distinct chain id so we can exercise the "chain not in options" branch. */
const OTHER_CHAIN_ID = 137;

/** Canonical raffle-configured USDC token — the chain+tokenId match path. */
const RAFFLE_USDC: RaffleCryptoToken = {
	tokenId: 'usdc',
	symbol: 'USDC',
	price: null,
	address: USDC_ADDR,
	decimals: 6,
	isStablecoin: true,
};

/** Canonical raffle-configured non-stablecoin — exercises price/decimals differently. */
const RAFFLE_EARNM: RaffleCryptoToken = {
	tokenId: 'earnm',
	symbol: 'EARNM',
	price: '0.1',
	address: EARNM_ADDR,
	decimals: 18,
	isStablecoin: false,
};

/** Caller-provided fallback — matches when currency lowercased equals its tokenId. */
const FALLBACK_TOKEN: RaffleCryptoToken = {
	tokenId: 'fallback',
	symbol: 'FBK',
	price: '1',
	address: EARNM_ADDR,
	decimals: 18,
	isStablecoin: false,
};

const CRYPTO_OPTIONS: RaffleCryptoOptions = {
	chains: [
		{
			chainId: CHAIN_ID,
			name: 'Base',
			tokens: [RAFFLE_USDC, RAFFLE_EARNM],
		},
	],
};

/** Same schema, but with an empty token list — covers the "chain present but no tokens" branch. */
const CRYPTO_OPTIONS_EMPTY_TOKENS: RaffleCryptoOptions = {
	chains: [{ chainId: CHAIN_ID, name: 'Base', tokens: [] }],
};

/** Options with no chains at all — covers the "chain not found" branch via empty list. */
const CRYPTO_OPTIONS_NO_CHAINS: RaffleCryptoOptions = { chains: [] };

function buildArgs(
	overrides: Partial<BuildRecoveredTokenArgs>,
): BuildRecoveredTokenArgs {
	return {
		currency: 'USDC',
		chainId: CHAIN_ID,
		fallbackToken: FALLBACK_TOKEN,
		cryptoOptions: CRYPTO_OPTIONS,
		...overrides,
	};
}

// ==========================================
// Tests
// ==========================================

describe('buildRecoveredCheckoutToken', () => {
	describe('branch 1 — raffle chain/token match', () => {
		test('returns the raffle-configured token identity when chain+tokenId match', () => {
			// Normalizes currency to lowercase before matching — 'USDC' → 'usdc'.
			const token = buildRecoveredCheckoutToken(
				buildArgs({ currency: 'USDC' }),
			);

			expect(token).toBe(RAFFLE_USDC);
		});

		test('matches the second token in the list (not just index 0)', () => {
			// Guards against a regression where the find is replaced with [0].
			const token = buildRecoveredCheckoutToken(
				buildArgs({ currency: 'EARNM' }),
			);

			expect(token).toBe(RAFFLE_EARNM);
		});

		test('matches regardless of input currency casing', () => {
			// Raffle tokenIds are stored lowercased; the helper must normalize
			// the incoming currency string so backend variations still match.
			const mixed = buildRecoveredCheckoutToken(
				buildArgs({ currency: 'UsDc' }),
			);
			const lowered = buildRecoveredCheckoutToken(
				buildArgs({ currency: 'usdc' }),
			);

			expect(mixed).toBe(RAFFLE_USDC);
			expect(lowered).toBe(RAFFLE_USDC);
		});
	});

	describe('branch 2 — caller fallback match', () => {
		test('returns fallbackToken when tokenId matches and raffle options miss', () => {
			// Chain present with no tokens forces the find to miss, pushing
			// control into the caller-fallback branch.
			const token = buildRecoveredCheckoutToken(
				buildArgs({
					currency: 'FALLBACK',
					cryptoOptions: CRYPTO_OPTIONS_EMPTY_TOKENS,
				}),
			);

			expect(token).toBe(FALLBACK_TOKEN);
		});

		test('uses fallbackToken when the chain is not in raffle options at all', () => {
			// chainId OTHER_CHAIN_ID is not in CRYPTO_OPTIONS → chainTokens empty
			// → fallback check activates.
			const token = buildRecoveredCheckoutToken(
				buildArgs({ currency: 'FALLBACK', chainId: OTHER_CHAIN_ID }),
			);

			expect(token).toBe(FALLBACK_TOKEN);
		});

		test('skips fallback when tokenId does not match the normalized currency', () => {
			// Confirms the chain of `if (matchedToken) return ... ; if (fallback) return`
			// — fallback must NOT match when tokenId differs.
			const token = buildRecoveredCheckoutToken(
				buildArgs({
					currency: 'unknown-token',
					cryptoOptions: CRYPTO_OPTIONS_EMPTY_TOKENS,
				}),
			);

			expect(token).not.toBe(FALLBACK_TOKEN);
			expect(token.tokenId).toBe('unknown-token');
		});
	});

	describe('branch 3 — synthetic stablecoin fallback', () => {
		test('synthesizes a USDC-shaped token when no raffle or caller match exists', () => {
			// Only reached when backend stores a token not in current options
			// AND the caller fallback doesn't match either — we check the
			// stablecoin shape defaults here.
			const token = buildRecoveredCheckoutToken(
				buildArgs({
					currency: 'USDC',
					cryptoOptions: CRYPTO_OPTIONS_NO_CHAINS,
					fallbackToken: { ...FALLBACK_TOKEN, tokenId: 'not-usdc' },
				}),
			);

			expect(token).toEqual({
				tokenId: 'usdc',
				symbol: 'USDC',
				price: null,
				address: zeroAddress,
				decimals: 6,
				isStablecoin: true,
			});
		});

		test('synthesizes USDT with the same stablecoin defaults', () => {
			const token = buildRecoveredCheckoutToken(
				buildArgs({
					currency: 'USDT',
					cryptoOptions: CRYPTO_OPTIONS_NO_CHAINS,
					fallbackToken: { ...FALLBACK_TOKEN, tokenId: 'not-usdt' },
				}),
			);

			expect(token.isStablecoin).toBe(true);
			expect(token.price).toBeNull();
			expect(token.decimals).toBe(6);
		});

		test('non-stablecoin synth flips isStablecoin=false, decimals=18, price="0"', () => {
			// Ensures the ternary covers both arms: `isStablecoin ? ... : ...`.
			const token = buildRecoveredCheckoutToken(
				buildArgs({
					currency: 'CUSTOM',
					cryptoOptions: CRYPTO_OPTIONS_NO_CHAINS,
					fallbackToken: { ...FALLBACK_TOKEN, tokenId: 'not-custom' },
				}),
			);

			expect(token).toEqual({
				tokenId: 'custom',
				symbol: 'CUSTOM',
				price: '0',
				address: zeroAddress,
				decimals: 18,
				isStablecoin: false,
			});
		});

		test('preserves the original-case symbol while lowercasing the tokenId', () => {
			// The symbol is the caller-facing display string; the tokenId is
			// the lookup key. This distinction matters when backend returns
			// 'EarnM' — the user should still see "EarnM", not "earnm".
			const token = buildRecoveredCheckoutToken(
				buildArgs({
					currency: 'EarnM',
					cryptoOptions: CRYPTO_OPTIONS_NO_CHAINS,
					fallbackToken: { ...FALLBACK_TOKEN, tokenId: 'mismatch' },
				}),
			);

			expect(token.tokenId).toBe('earnm');
			expect(token.symbol).toBe('EarnM');
		});
	});

	describe('precedence — raffle match beats fallback match', () => {
		test('returns raffle token even when fallbackToken tokenId also matches', () => {
			// When both branches could match, the raffle match MUST win because
			// it carries the authoritative per-chain ERC20 address.
			const ambiguousFallback: RaffleCryptoToken = {
				...FALLBACK_TOKEN,
				tokenId: 'usdc',
			};
			const token = buildRecoveredCheckoutToken(
				buildArgs({ currency: 'USDC', fallbackToken: ambiguousFallback }),
			);

			expect(token).toBe(RAFFLE_USDC);
			expect(token).not.toBe(ambiguousFallback);
		});
	});

	describe('edge — empty currency string', () => {
		test('synthesizes a non-stablecoin synthetic when currency is empty', () => {
			// Empty currency lowercases to '' which is neither 'usdc' nor 'usdt',
			// so the synth must fall into the non-stablecoin default branch.
			const token = buildRecoveredCheckoutToken(
				buildArgs({
					currency: '',
					cryptoOptions: CRYPTO_OPTIONS_NO_CHAINS,
					fallbackToken: { ...FALLBACK_TOKEN, tokenId: 'mismatch' },
				}),
			);

			expect(token.tokenId).toBe('');
			expect(token.symbol).toBe('');
			expect(token.isStablecoin).toBe(false);
			expect(token.decimals).toBe(18);
			expect(token.price).toBe('0');
		});
	});
});
