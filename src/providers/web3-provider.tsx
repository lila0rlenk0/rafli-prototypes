'use client';

import '@rainbow-me/rainbowkit/styles.css';

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';

import { isWeb3Enabled, WAGMI_COOKIE_KEY } from '@/lib/web3/constants';

/**
 * Signals whether `WagmiProvider` is actually mounted in the tree above.
 *
 * Needed because `Web3Provider` intentionally defers mounting `WagmiProvider`
 * until a client-side `useEffect` dynamically imports the SSR-unsafe wagmi
 * config. During SSR and the pre-hydration paint, `WagmiProvider` is not in
 * the tree, so any descendant calling a wagmi hook (`useConfig`, `useAccount`,
 * `useConnection`, etc.) throws `WagmiProviderNotFoundError`. Consumers must
 * read this flag and skip wagmi hook calls until it becomes `true`.
 *
 * Default `false` — when the provider is not in the tree at all (Web3
 * disabled, or module not yet evaluated), consumers should behave as if wagmi
 * is unavailable rather than optimistically calling hooks.
 */
const Web3ReadyContext = createContext(false);

/**
 * Signals that Web3 will never become ready in this session.
 *
 * `true` when the environment permanently blocks Web3 initialization —
 * either `isWeb3Enabled` is false (no WalletConnect project ID) or
 * `localStorage` is inaccessible (embedded WebViews like Telegram,
 * Instagram, Twitter in-app browsers where storage is sandboxed).
 *
 * Consumers use this to swap the perpetual spinner for a "use a real
 * browser" message so the user isn't stuck waiting on something that
 * will never resolve.
 */
const Web3UnavailableContext = createContext(false);

/**
 * Returns `true` once `WagmiProvider` is mounted and wagmi hooks are safe to
 * call in this subtree. Gate any component that uses wagmi hooks on this
 * signal — render a placeholder while `false` and swap to the wagmi-using
 * subcomponent once `true` (the subcomponent must be a child component so
 * React re-mounts it fresh, preserving Rules of Hooks ordering).
 *
 * @returns whether wagmi is ready for use in the current subtree
 */
export function useIsWeb3Ready(): boolean {
	return useContext(Web3ReadyContext);
}

/**
 * Returns `true` when Web3 is permanently unavailable in this session.
 * Use to show a "open in browser" message instead of a perpetual spinner.
 *
 * @returns whether Web3 will never become ready
 */
export function useIsWeb3Unavailable(): boolean {
	return useContext(Web3UnavailableContext);
}

/**
 * Probes whether `localStorage` is accessible in this browser context.
 *
 * RainbowKit (`getRecentWalletIds`) and `@wagmi/connectors` (`metaMask.ts`)
 * access localStorage eagerly on init without try/catch. In embedded
 * WebViews (Telegram, Instagram, Twitter in-app browsers) and some
 * Chrome incognito modes, the browser throws `SecurityError`:
 * - Safari/Firefox: "The operation is insecure."
 * - Chrome/Android: "Access is denied for this document."
 *
 * A write+delete probe is the only reliable cross-browser test — checking
 * `typeof localStorage !== 'undefined'` passes even when get/set throws.
 *
 * @returns true when localStorage read/write succeeds
 */
function isLocalStorageAvailable(): boolean {
	try {
		const probe = '__web3_storage_probe__';
		localStorage.setItem(probe, '1');
		localStorage.removeItem(probe);
		return true;
	} catch {
		return false;
	}
}

/** Near-black accent — matches the app's border/button color token */
const ACCENT_COLOR = '#0F0F0F';

/** White foreground for contrast on the dark accent */
const ACCENT_FOREGROUND = '#FFFFFF';

/**
 * Custom RainbowKit theme matching app's light design system.
 *
 * Overrides:
 * - Black accent to match app's border/button style
 * - Large border radius for rounded cards/buttons
 * - System font stack (app uses Clash Display for headings, system for body)
 */
const appTheme = lightTheme({
	accentColor: ACCENT_COLOR,
	accentColorForeground: ACCENT_FOREGROUND,
	borderRadius: 'large',
	fontStack: 'system',
});

interface Web3ProviderProps {
	readonly children: ReactNode;
	readonly wagmiCookieValue?: string | null;
}

/**
 * Wraps children with wagmi + RainbowKit for wallet connectivity.
 *
 * Scope: sits below QueryProvider and above the page tree. Shares
 * the app's QueryClient — wagmi uses namespaced query keys internally
 * so there are no cache collisions. A separate QueryClient would
 * override the app's configured defaults (staleTime: Infinity, refetch
 * disabled) since React Query uses the innermost QueryClientProvider.
 *
 * The wagmi config is lazy-loaded via dynamic import() to prevent
 * @walletconnect/keyvaluestorage from accessing indexedDB during SSR.
 * That module's constructor calls indexedDB.open() inside an async flow
 * that escapes try/catch — loading the config only after mount avoids
 * this. Children always render immediately (both server and client),
 * eliminating the hydration mismatch that ssr: false caused when it
 * prevented the entire subtree from rendering on the server.
 *
 * `wagmiCookieValue` is the serialized `wagmi.store` payload forwarded
 * from the server layout. Rebuilt as a single-cookie string locally so
 * wagmi can hydrate without exposing unrelated request cookies to client JS.
 *
 * Renders children directly (no-op) when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
 * is not configured — ensures card payments and the rest of the app work
 * even without Web3 infrastructure.
 *
 * @returns Children wrapped in Web3 providers, or bare children when disabled
 */
export function Web3Provider({
	children,
	wagmiCookieValue,
}: Web3ProviderProps) {
	const [wagmiConfig, setWagmiConfig] = useState<Config | null>(null);

	// Starts `false` to match the server render — prevents a hydration
	// mismatch when the client detects an unavailable environment. The
	// mount effect below flips it to `true` synchronously on the first
	// paint, so the UI flash from spinner → "open in browser" is a
	// single frame in restricted contexts.
	const [web3Unavailable, setWeb3Unavailable] = useState(false);

	// mount: detect restricted environments then lazy-load wagmi config.
	//
	// Step 1 — probe localStorage. RainbowKit and @wagmi/connectors access
	// it eagerly without try/catch. In embedded WebViews (Telegram,
	// Instagram, Twitter in-app browsers) and some Chrome incognito modes,
	// the browser throws SecurityError. Detecting it upfront avoids the
	// unhandled error from the dynamic import below (Sentry RAFLI-B/C).
	//
	// Step 2 — dynamic import() wagmi config to keep WalletConnect's
	// indexedDB access out of the SSR pre-render. config.ts calls
	// getDefaultConfig → WalletConnect connector chain, which requires a
	// browser with indexedDB. Only runs when storage is available.
	useEffect(() => {
		if (!isWeb3Enabled || !isLocalStorageAvailable()) {
			setWeb3Unavailable(true);
			return;
		}

		void import('@/lib/web3/config').then(mod => {
			if (mod.wagmiConfig) setWagmiConfig(mod.wagmiConfig);
		});
	}, []);

	// Reconstruct the single cookie string wagmi expects for SSR hydration.
	// useMemo avoids re-parsing on every render — only recomputes when the
	// server-forwarded cookie value or the config itself changes.
	const initialState = useMemo(
		() =>
			wagmiConfig && wagmiCookieValue
				? cookieToInitialState(
						wagmiConfig,
						`${WAGMI_COOKIE_KEY}=${wagmiCookieValue}`,
					)
				: undefined,
		[wagmiConfig, wagmiCookieValue],
	);

	// No config loaded yet (SSR / pre-hydration) or Web3 disabled →
	// pass children through. This guarantees the server-rendered tree
	// matches the initial client tree, preventing hydration mismatch.
	// `Web3ReadyContext` is `false` in this branch so descendants gate
	// their wagmi-hook usage and avoid `WagmiProviderNotFoundError`.
	// `Web3UnavailableContext` tells descendants whether to show a
	// permanent "use a real browser" message vs a transient spinner.
	if (!wagmiConfig) {
		return (
			<Web3UnavailableContext.Provider value={web3Unavailable}>
				<Web3ReadyContext.Provider value={false}>
					{children}
				</Web3ReadyContext.Provider>
			</Web3UnavailableContext.Provider>
		);
	}

	return (
		<Web3UnavailableContext.Provider value={false}>
			<Web3ReadyContext.Provider value={true}>
				<WagmiProvider config={wagmiConfig} initialState={initialState}>
					<RainbowKitProvider theme={appTheme}>{children}</RainbowKitProvider>
				</WagmiProvider>
			</Web3ReadyContext.Provider>
		</Web3UnavailableContext.Provider>
	);
}
