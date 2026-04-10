/**
 * Wagmi + RainbowKit runtime configuration.
 *
 * ⚠️  SSR-UNSAFE — this module calls getDefaultConfig() at module scope,
 * which creates WalletConnect connectors. The connector creation chain
 * reaches @walletconnect/keyvaluestorage whose constructor calls
 * indexedDB.open() inside an async flow that escapes try/catch.
 * Since Node.js has no indexedDB global, evaluating this module during
 * SSR pre-render throws a ReferenceError.
 *
 * Only import this module via dynamic import() on the client side.
 * For SSR-safe constants (isWeb3Enabled, chain IDs, storage), import
 * from '@/lib/web3/constants' instead.
 */
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

import { clientEnv } from '@/env/client';

import { configuredChains, isWeb3Enabled, wagmiStorage } from './constants';

// ==========================================
// Wallet List
// ==========================================

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

// ==========================================
// Wagmi Config
// ==========================================

/**
 * Combined wagmi + RainbowKit configuration.
 *
 * Uses getDefaultConfig which bundles createConfig + RainbowKit connector setup.
 * Connector SDKs are optional peer deps of @wagmi/connectors —
 * @walletconnect/ethereum-provider, @base-org/account, @coinbase/wallet-sdk,
 * and @metamask/sdk must be installed for their respective wallets to work.
 * getDefaultConfig dynamically imports them at runtime via wagmi's connector factories.
 *
 * Initialized at module scope — `ssr: true` + `cookieStorage` tells wagmi to
 * defer all browser-only operations (connector handshakes) until client-side
 * hydration. However, WalletConnect's keyvaluestorage still accesses indexedDB
 * during connector construction, so this module must NOT be evaluated on the server.
 *
 * null when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is unset — without it,
 * WalletConnect handshake fails and breaks the provider tree.
 * Callers must check `isWeb3Enabled` before using this config.
 */
export const wagmiConfig = isWeb3Enabled
	? getDefaultConfig({
			appName: 'Rafli',
			// isWeb3Enabled guard guarantees this value is non-empty
			projectId: clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
			chains: configuredChains,
			storage: wagmiStorage,
			wallets,
			// Required for Next.js App Router — delays store hydration to
			// avoid server/client mismatch on first render
			ssr: true,
		})
	: null;
