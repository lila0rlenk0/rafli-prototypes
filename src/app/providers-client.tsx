'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Web3Provider } from '@/providers/web3-provider';

interface ProvidersClientProps {
	children: React.ReactNode;
	wagmiCookieValue?: string | null;
}

/**
 * Root client provider tree.
 *
 * QueryProvider is outermost — single QueryClient for both app queries and wagmi.
 * Web3Provider reuses the app's QueryClient instead of creating its own.
 * This avoids the nested-QueryClientProvider problem where the innermost
 * provider overrides the app's configured defaults (staleTime, refetch policies).
 *
 * @returns provider tree wrapping children
 */
export function ProvidersClient({
	children,
	wagmiCookieValue,
}: ProvidersClientProps) {
	return (
		<QueryProvider>
			<Web3Provider wagmiCookieValue={wagmiCookieValue}>
				<MixpanelProvider>{children}</MixpanelProvider>
			</Web3Provider>
		</QueryProvider>
	);
}
