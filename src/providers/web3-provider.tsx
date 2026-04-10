'use client';

import '@rainbow-me/rainbowkit/styles.css';

import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';

import { isWeb3Enabled, WAGMI_COOKIE_KEY } from '@/lib/web3/constants';

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

	// mount: lazy-load wagmi config to keep WalletConnect's indexedDB access
	// out of the SSR pre-render. The dynamic import() ensures config.ts
	// (which calls getDefaultConfig → WalletConnect connector chain) is
	// only evaluated in the browser where indexedDB exists.
	useEffect(() => {
		if (!isWeb3Enabled) return;

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
	if (!wagmiConfig) {
		return <>{children}</>;
	}

	return (
		<WagmiProvider config={wagmiConfig} initialState={initialState}>
			<RainbowKitProvider theme={appTheme}>{children}</RainbowKitProvider>
		</WagmiProvider>
	);
}
