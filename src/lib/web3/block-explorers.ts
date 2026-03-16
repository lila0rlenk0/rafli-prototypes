import type { CryptoChainConfig } from '@/types/crypto-config';

// ==========================================
// Validators
// ==========================================

/** Matches a valid EVM tx hash: 0x followed by exactly 64 hex characters */
const TX_HASH_REGEX = /^0x[\da-f]{64}$/i;

/**
 * Validates that a string looks like a well-formed EVM transaction hash.
 * Defense-in-depth: prevents malformed strings from being interpolated into
 * explorer URLs (e.g. XSS via `javascript:` or path traversal).
 *
 * Returns a type predicate so callers get `0x${string}` narrowing without
 * needing an unsafe `as` cast after validation.
 */
export function isValidTxHash(hash: string): hash is `0x${string}` {
	return TX_HASH_REGEX.test(hash);
}

// ==========================================
// Helpers
// ==========================================

/**
 * Gets block explorer URL for a transaction hash on a given chain.
 *
 * @param txHash - Transaction hash
 * @param chainId - Chain ID to look up explorer
 * @param chains - Chain configs from GET /payments/crypto/config
 * @returns Full explorer URL, or null if chain has no known explorer or txHash is invalid
 */
export function getTxExplorerUrl(
	txHash: string | undefined,
	chainId: number | null | undefined,
	chains: CryptoChainConfig[],
): string | null {
	if (!txHash || !chainId) return null;
	// Defense-in-depth: reject malformed hashes before URL interpolation
	if (!isValidTxHash(txHash)) return null;
	const chain = chains.find(c => c.chainId === chainId);
	if (!chain?.explorerTxUrl) return null;
	// Backend now ships explorerTxUrl as the tx route prefix (`.../tx`) instead of
	// a slash-terminated template. Normalize both `.../tx` and `.../tx/` so FE
	// links survive deploy skew and older cached configs.
	const explorerPrefix = chain.explorerTxUrl.replace(/\/+$/, '');
	return `${explorerPrefix}/${encodeURIComponent(txHash)}`;
}

/**
 * Gets the chain name from crypto config.
 *
 * @param chainId - EVM chain ID
 * @param chains - Chain configs from GET /payments/crypto/config
 * @returns Human-readable chain name, or fallback string
 */
export function getChainName(
	chainId: number,
	chains: CryptoChainConfig[],
): string {
	return chains.find(c => c.chainId === chainId)?.name ?? `Chain ${chainId}`;
}
