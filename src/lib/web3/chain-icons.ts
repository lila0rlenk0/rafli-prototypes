/**
 * Chain icon components using @web3icons/react.
 *
 * Maps chain IDs to their branded SVG network icon components.
 * Testnets get their own icons when available, otherwise fall back
 * to their mainnet parent's icon.
 */

import type { ComponentType } from 'react';

import {
	NetworkArbitrumOne,
	NetworkArbitrumSepolia,
	NetworkBase,
	NetworkBaseSepolia,
	NetworkEthereum,
	NetworkPolygon,
	NetworkPolygonAmoy,
	NetworkSepolia,
} from '@web3icons/react';

import type { IconComponentProps } from '@web3icons/react';

/** Chain icon component indexed by chain ID */
export const CHAIN_ICONS: Record<number, ComponentType<IconComponentProps>> = {
	// Ethereum mainnet + Sepolia testnet
	1: NetworkEthereum,
	11_155_111: NetworkSepolia,

	// Arbitrum mainnet + Sepolia testnet
	42_161: NetworkArbitrumOne,
	421_614: NetworkArbitrumSepolia,

	// Base mainnet + Sepolia testnet
	8_453: NetworkBase,
	84_532: NetworkBaseSepolia,

	// Polygon mainnet + Amoy testnet
	137: NetworkPolygon,
	80_002: NetworkPolygonAmoy,
};
