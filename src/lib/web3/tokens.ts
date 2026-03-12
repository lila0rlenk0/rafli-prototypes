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
	80_002: [USDC, USDT], // Polygon Amoy (mirrors Polygon mainnet)
};

/**
 * Gets all registered chain IDs from the token registry.
 * Used as fallback when raffle.cryptoChainIds is empty (= all chains allowed).
 * @returns Array of chain IDs that have at least one token configured
 */
export function getAllChainIds(): number[] {
	return Object.keys(TOKENS_BY_CHAIN).map(Number);
}

/**
 * Gets available tokens for a chain
 * @param chainId - EVM chain ID
 * @returns Array of available tokens, empty if chain not supported
 */
export function getTokensForChain(chainId: number): TokenInfo[] {
	return TOKENS_BY_CHAIN[chainId] ?? [];
}
