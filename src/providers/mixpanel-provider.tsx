'use client';

/**
 * Mixpanel Provider — side-effect-only wrapper that handles SDK
 * initialization and user identification.
 *
 * Scope: wraps the entire app layout so every route transition is
 * visible to the identification effect. Autocapture (page views,
 * clicks, scrolls, forms) is configured in mixpanel-client — this
 * provider only owns init + identify/reset lifecycle.
 */

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { identify, initMixpanel, reset } from '@/lib/analytics/mixpanel-client';
import { AUTH_COOKIES } from '@/lib/auth/constants';
import { useCookieConsentStore } from '@/providers/cookie-consent-store-provider';
import { COOKIE_CONSENT_STATUS } from '@/store/cookie-consent-store';

/**
 * Minimal schema for session cookie — excludes server-only fields
 * (emailVerified, permissions) that are stripped before serialization
 * to reduce XSS exposure surface. Only includes fields needed for
 * Mixpanel identification: id, email, name, avatar.
 */
const sessionCookieSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
	image: z.string().nullable().optional(),
});

type SessionCookieUser = z.infer<typeof sessionCookieSchema>;

/**
 * Parse user from session cookie with Zod validation.
 * Reads document.cookie directly — avoids a server round-trip for
 * analytics-only data that is already available client-side.
 *
 * @returns Parsed session user if valid session cookie exists, null otherwise
 */
function getUserFromCookie(): SessionCookieUser | null {
	if (typeof document === 'undefined') return null;

	const cookie = document.cookie
		.split('; ')
		.find(c => c.startsWith(`${AUTH_COOKIES.SESSION}=`));

	if (!cookie) return null;

	try {
		const value = decodeURIComponent(cookie.split('=')[1]);
		const parsed: unknown = JSON.parse(value);
		return sessionCookieSchema.parse(parsed);
	} catch {
		return null;
	}
}

/**
 * Initializes Mixpanel and handles user identification based on session cookie.
 *
 * @returns Children wrapped in a fragment — provider is side-effect only
 */
export function MixpanelProvider({ children }: { children: ReactNode }) {
	const [isReady, setIsReady] = useState(false);
	// App Router provides reactive pathname — effect fires only on actual
	// route transitions instead of running after every render.
	const pathname = usePathname();
	// GDPR/PECR gate — analytics SDK must not load until the user explicitly
	// accepts. `status === 'accepted'` is the single source of truth shared
	// with the visible `CookieConsentBanner`.
	const cookieConsentStatus = useCookieConsentStore(state => state.status);
	const hasCookieConsent =
		cookieConsentStatus === COOKIE_CONSENT_STATUS.ACCEPTED;

	// Ref instead of state: identity tracking is fire-and-forget metadata,
	// changes should NOT trigger re-renders of the entire subtree.
	const identifiedUserId = useRef<string | null>(null);

	// Init fires exactly once — when consent first flips to accepted. The
	// second dep (`hasCookieConsent`) flipping from false → true is the
	// load signal; flipping back to false on a later "revoke" flow would
	// not un-init a live SDK (Mixpanel holds no callable teardown), but
	// the identification effect below will stop calling `identify()` once
	// the user is signed out and the ref clears. Accept the one-way nature:
	// future revoke support should trigger a full page reload, not a
	// teardown attempt.
	//
	// Deps: [hasCookieConsent] — effect is a no-op until consent is granted.
	// Without this gate the SDK would load unconditionally on mount (old
	// behavior), violating the cookie-banner contract documented in
	// /privacy §5.
	useEffect(() => {
		if (!hasCookieConsent) return;
		let cancelled = false;

		void initMixpanel()
			.catch(() => undefined)
			.finally(() => {
				if (!cancelled) {
					setIsReady(true);
				}
			});

		// Cleanup: if the component unmounts before init resolves,
		// prevent the state update to avoid a React warning.
		return () => {
			cancelled = true;
		};
	}, [hasCookieConsent]);

	// Sync Mixpanel identity on every navigation.
	// Deps: [isReady, pathname] — fires once SDK initializes, then on each
	// App Router route transition. Replaces the previous no-deps effect that
	// ran after every render and used a ref to debounce.
	useEffect(() => {
		if (!isReady) return;

		const user = getUserFromCookie();

		// Identify new user or user change
		if (user && user.id !== identifiedUserId.current) {
			identify(user.id, {
				$email: user.email,
				$name: user.name,
				$avatar: user.image,
			});
			identifiedUserId.current = user.id;
			return;
		}

		// Reset identity on sign-out (cookie removed but ref still set)
		if (!user && identifiedUserId.current) {
			reset();
			identifiedUserId.current = null;
		}
	}, [isReady, pathname]);

	return <>{children}</>;
}
