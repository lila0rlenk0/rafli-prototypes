import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { cookieStorage, createStorage } from 'wagmi';
import {
	arbitrum,
	arbitrumSepolia,
	base,
	baseSepolia,
	mainnet,
	polygon,
	polygonAmoy,
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
 * Development/staging chains — testnets only, no mainnets
 */
const devChains = [sepolia, arbitrumSepolia, baseSepolia, polygonAmoy] as const;

/**
 * Select chain set based on environment
 * Production only gets mainnets; dev/staging gets testnets too
 */
const isProd = clientEnv.NEXT_PUBLIC_APP_ENV === 'production';
const configuredChains = isProd ? prodChains : devChains;

// ==========================================
// Wagmi + RainbowKit Config
// ==========================================

/**
 * Whether Web3/crypto features are available
 * Requires WalletConnect project ID to be configured in environment
 */
export const isWeb3Enabled = !!clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * wagmi persists its SSR hydration snapshot under `wagmi.store`.
 *
 * Keep the prefix explicit instead of relying on wagmi's default so the
 * server-side provider wrapper can safely extract only this cookie without
 * ever serializing the full request cookie header into the client bundle.
 */
export const WAGMI_STORAGE_KEY = 'wagmi';
export const WAGMI_COOKIE_KEY = `${WAGMI_STORAGE_KEY}.store`;

/**
 * Chain IDs FE is actually configured to support in the current environment.
 *
 * This is the UI/runtime source of truth for "selectable" chains.
 * It intentionally differs between prod and non-prod so we never surface
 * testnets in production even if backend allowlists are empty.
 */
export const SUPPORTED_WEB3_CHAIN_IDS = configuredChains.map(chain => chain.id);

/**
 * Persist wagmi state in cookies so App Router server renders can hydrate the
 * connected wallet state without a disconnect → reconnect flash.
 */
const wagmiStorage = createStorage({
	key: WAGMI_STORAGE_KEY,
	storage: cookieStorage,
});

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
			chains: configuredChains,
			storage: wagmiStorage,
			ssr: true, // Required for Next.js SSR hydration
		})
	: null;
