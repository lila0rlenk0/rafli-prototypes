'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Web3Provider } from '@/providers/web3-provider';

/**
 * Root Providers
 *
 * CRITICAL ordering: Web3Provider wraps its own QueryClientProvider for wagmi,
 * then QueryProvider wraps below it so the app's configured QueryClient
 * (staleTime: Infinity, refetch disabled) is the innermost — React Query
 * uses Context, so innermost QueryClientProvider wins for all app queries.
 */
export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<Web3Provider>
			<QueryProvider>
				<MixpanelProvider>{children}</MixpanelProvider>
			</QueryProvider>
		</Web3Provider>
	);
}
