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

/**
 * Chains used by wagmi + RainbowKit and exported for config creation.
 * Separated from config.ts so SSR-safe consumers can import chain info
 * without triggering getDefaultConfig() → WalletConnect → indexedDB.
 */
export const configuredChains = isProd ? prodChains : devChains;

// ==========================================
// SSR-Safe Constants
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
 *
 * SSR-safe — cookieStorage is wagmi's built-in adapter for server contexts.
 */
export const wagmiStorage = createStorage({
	key: WAGMI_STORAGE_KEY,
	storage: cookieStorage,
});
