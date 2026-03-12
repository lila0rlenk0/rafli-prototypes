'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Web3Provider } from '@/providers/web3-provider';

/**
 * Root Providers
 *
 * QueryProvider is outermost — single QueryClient for both app queries and wagmi.
 * Web3Provider no longer creates its own QueryClient; it reuses the app's.
 * This avoids the nested-QueryClientProvider problem where one overrides the other.
 */
export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<Web3Provider>
				<MixpanelProvider>{children}</MixpanelProvider>
			</Web3Provider>
		</QueryProvider>
	);
}
