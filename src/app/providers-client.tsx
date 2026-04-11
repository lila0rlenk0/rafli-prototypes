'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SentryUserSync } from '@/providers/sentry-user-sync';
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
 * `SentryUserSync` is a zero-render side-effect component mounted once here
 * so every client-side error captured during this page session is tagged
 * with the authenticated user ID. It has no DOM output and lives at the
 * root so it runs regardless of which route the user loads first.
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
				<MixpanelProvider>
					<SentryUserSync />
					{children}
				</MixpanelProvider>
			</Web3Provider>
		</QueryProvider>
	);
}
