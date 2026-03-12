/**
 * Human-readable chain names for UI display.
 * Covers all chains in the wagmi config (mainnets + testnets).
 */
export const CHAIN_NAMES: Record<number, string> = {
	1: 'Ethereum',
	42_161: 'Arbitrum',
	8453: 'Base',
	137: 'Polygon',
	11_155_111: 'Sepolia',
	421_614: 'Arbitrum Sepolia',
	84_532: 'Base Sepolia',
	80_002: 'Polygon Amoy',
};
