import { getDefaultConfig, type WalletList } from '@rainbow-me/rainbowkit';
import {
	baseAccount,
	metaMaskWallet,
	phantomWallet,
	rainbowWallet,
	safeWallet,
	trustWallet,
	walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
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
 * Explicit wallet list for the RainbowKit connect modal.
 *
 * getDefaultConfig only shows Safe, Rainbow, Base Account, MetaMask, and
 * WalletConnect by default. Listing wallets explicitly surfaces dedicated
 * options for popular providers (Phantom, Trust) so users see a familiar
 * entry point instead of having to go through the generic WalletConnect QR.
 *
 * Format: WalletList — array of { groupName, wallets } groups.
 * walletConnectWallet is last in "Other" — it acts as a catch-all for any
 * WC-compatible wallet not explicitly listed.
 */
const wallets: WalletList = [
	{
		groupName: 'Popular',
		wallets: [metaMaskWallet, baseAccount, phantomWallet, rainbowWallet],
	},
	{
		groupName: 'Other',
		wallets: [trustWallet, safeWallet, walletConnectWallet],
	},
];

/**
 * Combined wagmi + RainbowKit configuration.
 *
 * Uses getDefaultConfig which bundles createConfig + RainbowKit connector setup.
 * Connector SDKs are optional peer deps of @wagmi/connectors —
 * @walletconnect/ethereum-provider, @base-org/account, @coinbase/wallet-sdk,
 * and @metamask/sdk must be installed for their respective wallets to work.
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
			wallets,
			// Required for Next.js App Router — delays store hydration to
			// avoid server/client mismatch on first render
			ssr: true,
		})
	: null;
