'use client';

import '@rainbow-me/rainbowkit/styles.css';

import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useMemo, type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider } from 'wagmi';

import {
	getWagmiConfig,
	isWeb3Enabled,
	WAGMI_COOKIE_KEY,
} from '@/lib/web3/config';

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
	// Lazy singleton — only calls getDefaultConfig() on the first client render.
	// Returns null on the server so children render as a passthrough (no crash).
	const wagmiConfig = getWagmiConfig();

	// Reconstruct the single cookie string wagmi expects for SSR hydration.
	// useMemo avoids re-parsing on every render — only recomputes when the
	// server-forwarded cookie value or config reference changes.
	const initialState = useMemo(
		() =>
			wagmiCookieValue && wagmiConfig
				? cookieToInitialState(
						wagmiConfig,
						`${WAGMI_COOKIE_KEY}=${wagmiCookieValue}`,
					)
				: undefined,
		[wagmiCookieValue, wagmiConfig],
	);

	// No WalletConnect project ID or server-side → skip Web3 providers entirely.
	// Keeps the app functional for card-only payments and prevents SSR crashes.
	if (!isWeb3Enabled || !wagmiConfig) {
		return <>{children}</>;
	}

	return (
		<WagmiProvider config={wagmiConfig} initialState={initialState}>
			<RainbowKitProvider theme={appTheme}>{children}</RainbowKitProvider>
		</WagmiProvider>
	);
}
