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
	80_002: 'https://amoy.polygonscan.com/tx/',
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
 * Must match backend CHAIN_CONFIG confirmation thresholds exactly.
 * L1 (Ethereum): 12 blocks (~2.5 min) — standard finality threshold
 * L2 (Arbitrum, Base): 30 blocks — sequencer + L1 batch posting safety margin
 * L1 sidechain (Polygon): 50 blocks (~100s) — reorg protection
 * Testnets mirror their mainnet counterparts
 */
export const CONFIRMATION_TARGETS: Record<number, number> = {
	1: 12, // Ethereum — ~12s/block, 12 blocks ≈ 2.5 min
	42_161: 30, // Arbitrum — 30 blocks per backend CHAIN_CONFIG
	8453: 30, // Base — 30 blocks per backend CHAIN_CONFIG
	137: 50, // Polygon — ~2s blocks, 50 blocks per backend CHAIN_CONFIG
	11_155_111: 12, // Sepolia (mirrors Ethereum)
	421_614: 30, // Arbitrum Sepolia (mirrors Arbitrum)
	84_532: 30, // Base Sepolia (mirrors Base)
	80_002: 50, // Polygon Amoy (mirrors Polygon mainnet)
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
	chainId: number | null | undefined,
): string | null {
	if (!txHash || !chainId) return null;
	const base = BLOCK_EXPLORERS[chainId];
	if (!base) return null;
	return `${base}${txHash}`;
}
