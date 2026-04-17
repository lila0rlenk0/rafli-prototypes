'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SentryUserSync } from '@/providers/sentry-user-sync';

interface ProvidersClientProps {
	readonly children: React.ReactNode;
}

/**
 * Root client provider tree — app-wide concerns only.
 *
 * `QueryProvider` is outermost so the raffle-detail-scoped `Web3Provider`
 * (at `app/(public)/browse/[publicSlug]/layout.tsx`) can share the app's
 * configured `QueryClient` (staleTime: Infinity, refetch disabled). A
 * nested `QueryClientProvider` would override those defaults.
 *
 * `SentryUserSync` is a zero-render side-effect component mounted once here
 * so every client-side error captured during the session is tagged with the
 * authenticated user ID, regardless of which route the user lands on first.
 */
export function ProvidersClient({ children }: ProvidersClientProps) {
	return (
		<QueryProvider>
			<MixpanelProvider>
				<SentryUserSync />
				{children}
			</MixpanelProvider>
		</QueryProvider>
	);
}
