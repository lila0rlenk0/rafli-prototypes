/**
 * Frontend Token Registry
 *
 * Maps supported tokens per chain, mirroring the backend TOKEN_REGISTRY.
 * Used by the chain+token selector to show available payment options.
 *
 * Token slugs (e.g. 'usdc', 'usdt', 'earnm') are sent to the backend
 * in the crypto checkout payload. The backend validates against its own
 * registry and rejects unknown tokens or unsupported chain+token combos.
 */

// ==========================================
// Types
// ==========================================

export interface TokenInfo {
	/** Token slug sent to backend — must match TOKEN_REGISTRY key */
	slug: string;
	/** Display name for UI */
	label: string;
	/** Whether this is a stablecoin (implicit 1:1 USD pricing) */
	isStablecoin: boolean;
}

interface SelectableTokenOptions {
	/** Raffle allowlist — empty means backend allows every token in its registry */
	allowedTokenSlugs?: string[];
	/**
	 * Non-stablecoins require explicit per-ticket pricing on the raffle.
	 * Stablecoins ignore this list because backend prices them 1:1 to USD.
	 */
	pricedTokenSlugs?: string[];
}

// ==========================================
// Constants
// ==========================================

/** USDC — 6 decimals, available on all supported chains */
const USDC: TokenInfo = {
	slug: 'usdc',
	label: 'USDC',
	isStablecoin: true,
};

/** USDT — 6 decimals, available on all supported chains */
const USDT: TokenInfo = {
	slug: 'usdt',
	label: 'USDT',
	isStablecoin: true,
};

/** EARNM — 18 decimals, only on Arbitrum */
const EARNM: TokenInfo = {
	slug: 'earnm',
	label: 'EARNM',
	isStablecoin: false,
};

/**
 * Available tokens per chain — must match backend TOKEN_REGISTRY.
 * Order determines display order in the token selector.
 *
 * Stablecoins are shown on all chains. Non-stablecoins (EARNM) require
 * `cryptoTokenPricing` on the raffle — backend rejects if missing.
 */
export const TOKENS_BY_CHAIN: Record<number, TokenInfo[]> = {
	// Mainnets
	1: [USDC, USDT], // Ethereum
	42_161: [USDC, USDT, EARNM], // Arbitrum
	8453: [USDC, USDT], // Base
	137: [USDC, USDT], // Polygon
	// Testnets
	11_155_111: [USDC, USDT], // Sepolia
	421_614: [USDC, USDT], // Arbitrum Sepolia
	84_532: [USDC, USDT], // Base Sepolia
	// Backend PR 40 has no Amoy USDT deployment in TOKEN_REGISTRY — keep FE in lockstep
	80_002: [USDC], // Polygon Amoy
};

/**
 * Gets available tokens for a chain
 * @param chainId - EVM chain ID
 * @returns Array of available tokens, empty if chain not supported
 */
function getTokensForChain(chainId: number): TokenInfo[] {
	return TOKENS_BY_CHAIN[chainId] ?? [];
}

/**
 * Gets tokens that are actually selectable for a raffle on a given chain.
 *
 * Why this helper exists:
 * - Backend interprets empty `cryptoTokens` as "all registry tokens allowed"
 * - But non-stablecoins still require `cryptoTokenPricing`
 * - FE must not surface tokens the backend will deterministically reject
 */
export function getSelectableTokensForChain(
	chainId: number,
	{
		allowedTokenSlugs = [],
		pricedTokenSlugs = [],
	}: SelectableTokenOptions = {},
): TokenInfo[] {
	const pricedTokenSet = new Set(pricedTokenSlugs);

	return getTokensForChain(chainId).filter(token => {
		const isAllowed =
			allowedTokenSlugs.length === 0 ||
			allowedTokenSlugs.includes(token.slug);
		if (!isAllowed) return false;

		// Stablecoins are always valid once allowed; backend prices them 1:1 to USD.
		if (token.isStablecoin) return true;

		// Non-stablecoins are only valid when the raffle explicitly prices them.
		return pricedTokenSet.has(token.slug);
	});
}
