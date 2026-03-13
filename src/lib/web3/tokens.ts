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

/** Metadata for a supported payment token in the crypto checkout flow. */
export interface TokenInfo {
	/** Token slug sent to backend — must match TOKEN_REGISTRY key */
	slug: string;
	/** Display name for UI */
	label: string;
	/** Whether this is a stablecoin (implicit 1:1 USD pricing) */
	isStablecoin: boolean;
}

export interface SelectableTokenOptions {
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

/** EARNM — 18 decimals, backend-supported on selected Ethereum L2/L1 chains */
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
 *
 * Keep this in lockstep with the backend TOKEN_REGISTRY. If FE lags behind,
 * raffles that allow only a newly-supported chain/token pair become impossible
 * to purchase even though checkout succeeds server-side.
 */
export const TOKENS_BY_CHAIN: Record<number, TokenInfo[]> = {
	// Mainnets
	1: [USDC, USDT, EARNM], // Ethereum
	42_161: [USDC, USDT, EARNM], // Arbitrum
	8453: [USDC, USDT, EARNM], // Base
	137: [USDC, USDT, EARNM], // Polygon
	// Testnets
	11_155_111: [USDC, USDT], // Sepolia
	421_614: [USDC, USDT], // Arbitrum Sepolia
	84_532: [USDC, USDT], // Base Sepolia
	// Backend PR 40 has no Amoy USDT deployment in TOKEN_REGISTRY.
	// EARNM is supported there, so FE must still expose it when the raffle prices it.
	80_002: [USDC, EARNM], // Polygon Amoy
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
 * Resolves a token slug on a specific chain.
 *
 * Recovery flows need the inverse lookup because backend checkout recovery
 * returns the stored chain/session values, not necessarily the user's latest
 * FE selection. Returning null keeps the caller in control of the fallback UX
 * instead of silently inventing a token that may not exist on that chain.
 *
 * @param chainId - EVM chain ID
 * @param tokenSlug - Token slug to look up (e.g. 'usdc', 'earnm')
 * @returns Token metadata or null if not found on the given chain
 */
export function getTokenBySlugForChain(
	chainId: number,
	tokenSlug: string,
): TokenInfo | null {
	return (
		getTokensForChain(chainId).find(token => token.slug === tokenSlug) ?? null
	);
}

/**
 * Gets tokens that are actually selectable for a raffle on a given chain.
 *
 * Why this helper exists:
 * - Backend interprets empty `cryptoTokens` as "all registry tokens allowed"
 * - But non-stablecoins still require `cryptoTokenPricing`
 * - FE must not surface tokens the backend will deterministically reject
 *
 * @param chainId - EVM chain ID
 * @param options - Raffle allowlist and priced token slugs
 * @returns Filtered array of selectable tokens for the chain
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
			allowedTokenSlugs.length === 0 || allowedTokenSlugs.includes(token.slug);
		if (!isAllowed) return false;

		// Stablecoins are always valid once allowed; backend prices them 1:1 to USD.
		if (token.isStablecoin) return true;

		// Non-stablecoins are only valid when the raffle explicitly prices them.
		return pricedTokenSet.has(token.slug);
	});
}
