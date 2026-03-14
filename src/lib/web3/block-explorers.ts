import type { CryptoChainConfig } from '@/types/crypto-config';

// ==========================================
// Helpers
// ==========================================

/**
 * Gets the target confirmation count for a chain from crypto config.
 *
 * @param chainId - EVM chain ID
 * @param chains - Chain configs from GET /payments/crypto/config
 * @returns Number of blocks to consider "safe", or null if chain not in config
 */
export function getConfirmationTarget(
	chainId: number,
	chains: CryptoChainConfig[],
): number | null {
	return chains.find(c => c.chainId === chainId)?.confirmationTarget ?? null;
}

/**
 * Gets block explorer URL for a transaction hash on a given chain.
 *
 * @param txHash - Transaction hash
 * @param chainId - Chain ID to look up explorer
 * @param chains - Chain configs from GET /payments/crypto/config
 * @returns Full explorer URL, or null if chain has no known explorer
 */
export function getTxExplorerUrl(
	txHash: string | undefined,
	chainId: number | null | undefined,
	chains: CryptoChainConfig[],
): string | null {
	if (!txHash || !chainId) return null;
	const chain = chains.find(c => c.chainId === chainId);
	if (!chain?.explorerTxUrl) return null;
	return `${chain.explorerTxUrl}${txHash}`;
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
