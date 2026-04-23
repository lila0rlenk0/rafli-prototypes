'use client';

import type { ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { cookieToInitialState, WagmiProvider } from 'wagmi';

import { configuredNetworks } from '@/lib/web3/config/constants';
import {
	projectId,
	wagmiAdapter,
	wagmiConfig,
} from '@/lib/web3/config/wagmi-config';

interface Web3ProviderProps {
	readonly children: ReactNode;
	/**
	 * Scoped wagmi connection cookie (`wagmi.store=<state>`) for SSR
	 * hydration. Extracted from the request `Cookie` header by the
	 * raffle-detail segment layout — never the raw header — so the
	 * `httpOnly` session JWT is not serialized into the RSC flight payload.
	 * See `src/lib/web3/extract-wagmi-cookie.ts`.
	 */
	readonly wagmiCookie: string | null;
}

// Canonical public URL — used verbatim in AppKit modal metadata so wallets show
// a stable "requested by" origin regardless of which preview/prod host served
// the page. Matches `metadataBase` in `src/app/layout.tsx`.
const DAPP_URL = 'https://www.rafli.win';

/**
 * Curated wallets shown on the AppKit modal's main view, in priority order.
 *
 * AppKit defaults to MetaMask + Trust Wallet featured. Everything else lives
 * under "All Wallets" (lazy-loaded from WalletConnect's registry). No bundle
 * impact — the registry is an HTTP fetch on button click — but the main view
 * is user-facing surface area, so we curate it for Rafli's audience: USDC
 * checkout on Arbitrum / Base / Polygon, mostly US retail.
 *
 * Browser-extension wallets (MetaMask, Coinbase, Phantom, Rabby, Rainbow
 * extensions) auto-appear via EIP-6963 discovery regardless of this list;
 * the IDs below only drive the priority row + the "All Wallets" ordering.
 *
 * Verify each ID from https://walletguide.walletconnect.network before
 * editing — a stale hash silently falls through to the default registry.
 */
const FEATURED_WALLET_IDS = [
	// MetaMask — dominant EVM wallet, ~30M MAU
	'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
	// Coinbase Wallet — primary US retail wallet; also covers Smart Wallet
	'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
	// Phantom — EVM support since 2024, strong with crypto-native users
	'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
	// Rainbow — popular US consumer wallet
	'1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
	// Trust Wallet — largest mobile wallet globally
	'4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
	// Uniswap Wallet — DeFi-native on-ramp users
	'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a',
] as const;

/**
 * Registers Reown AppKit's global wallet modal as a module-scope side effect.
 *
 * AppKit is a singleton — `createAppKit` must run exactly once per app load
 * (Reown contract). The modal renders via a portal, so no React context is
 * produced here; `WagmiProvider` below supplies the actual wagmi context that
 * AppKit hooks consume.
 *
 * Guarded by `wagmiAdapter` truthy so a missing project ID degrades to a no-op
 * import rather than throwing — matching `wagmiConfig`'s null branch below.
 */
if (wagmiAdapter && projectId) {
	createAppKit({
		adapters: [wagmiAdapter],
		projectId,
		networks: configuredNetworks,
		defaultNetwork: configuredNetworks[0],
		metadata: {
			name: 'Rafli',
			description: 'Win big with crypto-verified sweepstakes',
			url: DAPP_URL,
			icons: [`${DAPP_URL}/web-app-manifest-512x512.png`],
		},
		featuredWalletIds: [...FEATURED_WALLET_IDS],
		// Minimal modal — wallet connection only. Every disabled feature would
		// otherwise pull extra chunks and surface UI we don't integrate.
		features: {
			analytics: false,
			swaps: false,
			onramp: false,
			send: false,
		},
	});
}

/**
 * Wraps children with wagmi for Reown AppKit wallet connectivity.
 *
 * `initialState` is derived from the forwarded request cookie via
 * `cookieToInitialState`, hydrating wagmi with the last-known connection so a
 * reload doesn't flash a disconnected wallet between SSR and the first client
 * render. The adapter's `cookieStorage` writes that cookie on every state
 * transition — the round trip is what makes SSR wallet state consistent.
 *
 * Mounted only by the raffle-detail segment layout
 * (`app/(public)/browse/[publicSlug]/layout.tsx`) — the single route that
 * renders crypto checkout. Admin/pricing/messages/profile/landing never
 * import this module, so the Reown bundle and `createAppKit` side effect
 * stay off those pages. First import on the detail route fires the
 * singleton; subsequent remounts reuse the cached module.
 *
 * Inherits the app's `QueryClient` from the root `QueryProvider` —
 * `QueryProvider` sits above this segment in the tree, so wagmi's internal
 * queries land in the same client. A local `QueryClientProvider` would
 * drop the app's defaults (staleTime: Infinity, refetch disabled).
 *
 * @returns children wrapped in wagmi, or bare children when Web3 is disabled
 *   (missing project ID at build time)
 */
export function Web3Provider({ children, wagmiCookie }: Web3ProviderProps) {
	if (!wagmiConfig) return <>{children}</>;

	const initialState = cookieToInitialState(wagmiConfig, wagmiCookie);

	return (
		<WagmiProvider config={wagmiConfig} initialState={initialState}>
			{children}
		</WagmiProvider>
	);
}
