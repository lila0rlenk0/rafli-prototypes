import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
	arbitrum,
	arbitrumSepolia,
	base,
	baseSepolia,
	mainnet,
	polygon,
	sepolia,
} from 'wagmi/chains';

import { clientEnv } from '@/env/client';

// ==========================================
// Chain Configuration
// ==========================================

/**
 * Production chains — mainnet EVM networks supporting USDC/USDT
 */
const prodChains = [mainnet, arbitrum, base, polygon] as const;

/**
 * Development chains — prod chains + testnets for local/staging testing
 */
const devChains = [
	...prodChains,
	sepolia,
	arbitrumSepolia,
	baseSepolia,
] as const;

/**
 * Select chain set based on environment
 * Production only gets mainnets; dev/staging gets testnets too
 */
const isProd = clientEnv.NEXT_PUBLIC_APP_ENV === 'production';

// ==========================================
// Wagmi + RainbowKit Config
// ==========================================

/**
 * Whether Web3/crypto features are available
 * Requires WalletConnect project ID to be configured in environment
 */
export const isWeb3Enabled = !!clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * Combined wagmi + RainbowKit configuration
 * Uses getDefaultConfig which bundles createConfig + RainbowKit setup
 *
 * Only initialized when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set —
 * without it, WalletConnect handshake fails and breaks the provider tree.
 * Callers must check `isWeb3Enabled` before using this config.
 */
export const wagmiConfig = isWeb3Enabled
	? getDefaultConfig({
			appName: 'Rafli',
			projectId: clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
			chains: isProd ? prodChains : devChains,
			ssr: true, // Required for Next.js SSR hydration
		})
	: null;
