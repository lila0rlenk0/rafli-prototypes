'use client';

import { CookieConsentBanner } from '@/components/compliance/cookie-consent-banner';
import { CookieConsentStoreProvider } from '@/providers/cookie-consent-store-provider';
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
 * `CookieConsentStoreProvider` wraps `MixpanelProvider` — the analytics
 * SDK must only initialize after the user accepts cookies, so consent
 * must be available to Mixpanel via context. The visible
 * `CookieConsentBanner` lives as a sibling so it can call `accept`/
 * `reject` from the same store.
 *
 * `SentryUserSync` is a zero-render side-effect component mounted once here
 * so every client-side error captured during the session is tagged with the
 * authenticated user ID, regardless of which route the user lands on first.
 */
export function ProvidersClient({ children }: ProvidersClientProps) {
	return (
		<QueryProvider>
			<CookieConsentStoreProvider>
				<MixpanelProvider>
					<SentryUserSync />
					{children}
					<CookieConsentBanner />
				</MixpanelProvider>
			</CookieConsentStoreProvider>
		</QueryProvider>
	);
}
