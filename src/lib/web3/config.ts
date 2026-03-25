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
 * Select chain set based on environment.
 * Production only gets mainnets; dev/staging gets testnets too.
 */
const isProd = clientEnv.NEXT_PUBLIC_APP_ENV === 'production';
const configuredChains = isProd ? prodChains : devChains;

// ==========================================
// Wagmi + RainbowKit Config
// ==========================================

/**
 * Whether Web3/crypto features are available.
 * Requires WalletConnect project ID to be configured in environment.
 *
 * @returns true when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set
 */
export const isWeb3Enabled = !!clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * wagmi persists its SSR hydration snapshot under `wagmi.store`.
 *
 * Explicit prefix instead of wagmi's default so the server-side provider
 * wrapper can extract only this cookie without serializing the full request
 * cookie header into the client bundle.
 */
export const WAGMI_STORAGE_KEY = 'wagmi';
export const WAGMI_COOKIE_KEY = `${WAGMI_STORAGE_KEY}.store`;

/**
 * Chain IDs the FE is configured to support in the current environment.
 *
 * UI/runtime source of truth for "selectable" chains.
 * Intentionally differs between prod and non-prod so testnets never
 * surface in production even if backend allowlists are empty.
 *
 * @returns array of supported chain IDs
 */
export const SUPPORTED_WEB3_CHAIN_IDS = configuredChains.map(chain => chain.id);

/**
 * Cookie-based wagmi storage for SSR hydration.
 * Persists connected wallet state so App Router server renders can hydrate
 * without a disconnect → reconnect flash.
 */
const wagmiStorage = createStorage({
	key: WAGMI_STORAGE_KEY,
	storage: cookieStorage,
});

/**
 * Combined wagmi + RainbowKit configuration.
 *
 * Uses getDefaultConfig which bundles createConfig + RainbowKit connector setup.
 * In wagmi v3, connector SDKs are optional peer deps — @walletconnect/ethereum-provider,
 * @coinbase/wallet-sdk, and @metamask/sdk must be installed separately in package.json.
 * getDefaultConfig dynamically imports them at runtime via wagmi's connector factories.
 *
 * Only initialized when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set —
 * without it, WalletConnect handshake fails and breaks the provider tree.
 * Callers must check `isWeb3Enabled` before using this config.
 *
 * @returns wagmi Config or null when Web3 is disabled
 */
export const wagmiConfig = isWeb3Enabled
	? getDefaultConfig({
			appName: 'Rafli',
			projectId: clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
			chains: configuredChains,
			storage: wagmiStorage,
			// Required for Next.js App Router — delays store hydration to
			// avoid server/client mismatch on first render
			ssr: true,
		})
	: null;
