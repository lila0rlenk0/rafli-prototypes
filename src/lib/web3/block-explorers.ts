// ==========================================
// Block Explorer URLs
// ==========================================

/**
 * Block explorer base URLs for transaction links.
 * Maps chain ID → explorer tx URL prefix.
 * Includes both mainnet and testnet explorers.
 */
export const BLOCK_EXPLORERS: Record<number, string> = {
	1: 'https://etherscan.io/tx/',
	42_161: 'https://arbiscan.io/tx/',
	8453: 'https://basescan.org/tx/',
	137: 'https://polygonscan.com/tx/',
	11_155_111: 'https://sepolia.etherscan.io/tx/',
	421_614: 'https://sepolia.arbiscan.io/tx/',
	84_532: 'https://sepolia.basescan.org/tx/',
};

// ==========================================
// Confirmation Targets
// ==========================================

/**
 * Target confirmation blocks per chain — drives both UI progress and FE-driven finalization.
 * When confirmations reach this target, the frontend calls POST /payments/crypto/confirm
 * to request immediate finalization (bypassing the backend cron).
 * Backend still independently validates — these thresholds are advisory, not authoritative.
 *
 * L1 (Ethereum): 12 blocks (~2.5 min) — standard finality threshold
 * L2 (Arbitrum, Base, Polygon): 2 blocks (~1-4s) — near-instant finality
 * Testnets mirror their mainnet counterparts
 */
export const CONFIRMATION_TARGETS: Record<number, number> = {
	1: 12, // Ethereum — ~12s/block, 12 blocks ≈ 2.5 min
	42_161: 2, // Arbitrum — sub-second blocks, 2 for safety
	8453: 2, // Base — ~2s blocks
	137: 2, // Polygon — ~2s blocks
	11_155_111: 12, // Sepolia (mirrors Ethereum)
	421_614: 2, // Arbitrum Sepolia
	84_532: 2, // Base Sepolia
};

/**
 * Default confirmation target for unknown chains
 */
const DEFAULT_CONFIRMATION_TARGET = 6;

/**
 * Gets the target confirmation count for a chain
 *
 * @param chainId - EVM chain ID
 * @returns Number of blocks to consider "safe"
 */
export function getConfirmationTarget(chainId: number): number {
	return CONFIRMATION_TARGETS[chainId] ?? DEFAULT_CONFIRMATION_TARGET;
}

/**
 * Gets block explorer URL for a transaction hash on a given chain
 *
 * @param txHash - Transaction hash
 * @param chainId - Chain ID to look up explorer
 * @returns Full explorer URL, or null if chain has no known explorer
 */
export function getTxExplorerUrl(
	txHash: string | undefined,
	chainId: number | null,
): string | null {
	if (!txHash || !chainId) return null;
	const base = BLOCK_EXPLORERS[chainId];
	if (!base) return null;
	return `${base}${txHash}`;
}
