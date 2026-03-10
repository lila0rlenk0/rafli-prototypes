'use client';

import '@rainbow-me/rainbowkit/styles.css';

import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { WagmiProvider } from 'wagmi';

import { isWeb3Enabled, wagmiConfig } from '@/lib/web3/config';

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
 * Wraps children with wagmi + RainbowKit providers for wallet connectivity.
 * Uses a separate QueryClient from the app's main React Query provider
 * to avoid cache collisions between wagmi's internal queries and app queries.
 *
 * Renders children directly (no-op) when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
 * is not configured — ensures card payments and the rest of the app work
 * even without Web3 infrastructure.
 */
export function Web3Provider({ children }: { children: React.ReactNode }) {
	// Wagmi requires its own QueryClient — separate from the app's React Query instance
	// to prevent cache key collisions between wagmi internal queries and app data queries
	const [queryClient] = useState(() => new QueryClient());

	// No WalletConnect project ID → skip Web3 providers entirely
	// This keeps the app functional for card-only payments
	if (!isWeb3Enabled || !wagmiConfig) {
		return <>{children}</>;
	}

	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider theme={appTheme}>{children}</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
