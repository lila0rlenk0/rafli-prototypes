/**
 * Chain icon components for crypto checkout UI.
 *
 * React SVG components sourced from RainbowKit's bundled chain icons
 * (@rainbow-me/rainbowkit/dist/*). We extract them here because
 * RainbowKit only exposes icons via ConnectButton.Custom for the
 * currently connected chain — we need icons for all chains in the selector.
 *
 * Testnets reuse their mainnet parent's icon.
 */

import type { ComponentProps, ComponentType } from 'react';

import { ArbitrumIcon } from '@/assets/icons/chains/arbitrum-icon';
import { BaseIcon } from '@/assets/icons/chains/base-icon';
import { EthereumIcon } from '@/assets/icons/chains/ethereum-icon';
import { PolygonIcon } from '@/assets/icons/chains/polygon-icon';

interface ChainIcon {
	/** React SVG component for the chain's logo */
	icon: ComponentType<ComponentProps<'svg'>>;
	/** Background color for the icon container */
	iconBackground: string;
}

/**
 * Chain icons indexed by chain ID.
 * Testnets reuse their mainnet parent's icon.
 */
export const CHAIN_ICONS: Record<number, ChainIcon> = {
	// Ethereum mainnet + Sepolia testnet
	1: { icon: EthereumIcon, iconBackground: '#25292E' },
	11_155_111: { icon: EthereumIcon, iconBackground: '#25292E' },

	// Arbitrum mainnet + Sepolia testnet
	42_161: { icon: ArbitrumIcon, iconBackground: '#96BEDC' },
	421_614: { icon: ArbitrumIcon, iconBackground: '#96BEDC' },

	// Base mainnet + Sepolia testnet
	8453: { icon: BaseIcon, iconBackground: '#0052FF' },
	84_532: { icon: BaseIcon, iconBackground: '#0052FF' },

	// Polygon mainnet + Amoy testnet
	137: { icon: PolygonIcon, iconBackground: '#7B3FE4' },
	80_002: { icon: PolygonIcon, iconBackground: '#7B3FE4' },
};
