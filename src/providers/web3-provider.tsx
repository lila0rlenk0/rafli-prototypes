'use client';

import '@rainbow-me/rainbowkit/styles.css';

import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useMemo } from 'react';
import { cookieToInitialState, WagmiProvider } from 'wagmi';

import {
	isWeb3Enabled,
	WAGMI_COOKIE_KEY,
	wagmiConfig,
} from '@/lib/web3/config';

// ==========================================
// Theme
// ==========================================

/**
 * Custom RainbowKit theme matching app's light design system
 * Derives from lightTheme() and overrides key tokens:
 * - Black accent to match app's border/button style (#0F0F0F)
 * - Large border radius for rounded cards/buttons
 * - System font stack (app uses Clash Display for headings but system for body)
 */
const appTheme = lightTheme({
	accentColor: '#0F0F0F',
	accentColorForeground: '#FFFFFF',
	borderRadius: 'large',
	fontStack: 'system',
});

// ==========================================
// Component
// ==========================================

/**
 * Web3Provider Component
 *
 * Wraps children with wagmi + RainbowKit for wallet connectivity.
 * Shares the app's QueryClient (from QueryProvider in providers.tsx) — wagmi
 * uses namespaced query keys internally so there are no cache collisions.
 * A separate QueryClient would override the app's configured defaults
 * (staleTime: Infinity, refetch disabled) since React Query uses the innermost
 * QueryClientProvider, breaking either app queries or wagmi polling.
 *
 * `wagmiCookieValue` is only the serialized `wagmi.store` payload from the
 * server-rendered request. Rebuild the single-cookie string locally so wagmi
 * can hydrate without exposing unrelated request cookies to client JavaScript.
 *
 * Wagmi hooks that need polling (e.g. useTransactionConfirmations) explicitly
 * set refetchInterval per-query, overriding the global staleTime: Infinity.
 *
 * Renders children directly (no-op) when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
 * is not configured — ensures card payments and the rest of the app work
 * even without Web3 infrastructure.
 */
interface Web3ProviderProps {
	children: React.ReactNode;
	wagmiCookieValue?: string | null;
}

export function Web3Provider({
	children,
	wagmiCookieValue,
}: Web3ProviderProps) {
	const initialState = useMemo(
		() =>
			wagmiCookieValue && wagmiConfig
				? cookieToInitialState(
						wagmiConfig,
						`${WAGMI_COOKIE_KEY}=${wagmiCookieValue}`,
					)
				: undefined,
		[wagmiCookieValue],
	);

	// No WalletConnect project ID → skip Web3 providers entirely
	// This keeps the app functional for card-only payments
	if (!isWeb3Enabled || !wagmiConfig) {
		return <>{children}</>;
	}

	return (
		<WagmiProvider config={wagmiConfig} initialState={initialState}>
			<RainbowKitProvider theme={appTheme}>{children}</RainbowKitProvider>
		</WagmiProvider>
	);
}
