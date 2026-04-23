'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useCookieConsentStore } from '@/providers/cookie-consent-store-provider';
import { COOKIE_CONSENT_STATUS } from '@/store/cookie-consent-store';

/**
 * Cookie consent banner — compact toast pinned to the bottom-inline-end of
 * the viewport until the user picks Accept or Reject. Hidden once consent
 * is recorded (either way) so returning users never see it a second time.
 * The store persists to localStorage, so returning users on the same
 * browser restore their choice on mount.
 *
 * Relationship to MixpanelProvider: MixpanelProvider reads the same store
 * and only calls `initMixpanel()` when `status === 'accepted'`. This gate
 * is the operational enforcement of the &quot;Cookies &amp; Analytics&quot;
 * section in /privacy.
 *
 * Hardening:
 *  - logical `end-4` positioning mirrors automatically under RTL locales
 *  - width capped at `max-w-sm` and floored at `w-[calc(100vw-2rem)]` so
 *    long translations (German / Arabic expansion) wrap instead of
 *    pushing content off-screen on narrow mobile viewports
 *  - entrance animation gated on `motion-safe:` — respects
 *    `prefers-reduced-motion`
 *  - `aria-describedby` links the descriptive copy to the dialog role so
 *    screen readers announce the full explanation, not just the label
 *
 * @returns Banner element, or `null` when consent is resolved
 */
export function CookieConsentBanner() {
	const status = useCookieConsentStore(state => state.status);
	const accept = useCookieConsentStore(state => state.accept);
	const reject = useCookieConsentStore(state => state.reject);

	// Hide for resolved states — the store starts as 'pending' on SSR before
	// rehydration, which flashes the banner briefly for returning users on
	// first paint. Acceptable tradeoff: forcing a suspense fence here would
	// push rehydration into a full-tree boundary.
	if (status !== COOKIE_CONSENT_STATUS.PENDING) return null;

	return (
		<div
			// role="dialog" so screen readers announce it as a prompt requiring
			// action; aria-modal="false" because the rest of the page remains
			// operable — consent is persistent but non-blocking.
			role="dialog"
			aria-label="Cookie consent"
			aria-describedby="cookie-consent-description"
			aria-modal="false"
			className="bg-card text-card-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 w-drawer-main fixed end-4 bottom-4 z-50 max-w-sm rounded-xl border-2 border-black p-4 shadow-lg duration-300"
		>
			<p className="text-sm font-semibold">We value your privacy</p>
			<p
				id="cookie-consent-description"
				className="text-muted-foreground mt-1 text-xs/relaxed"
			>
				We use cookies to run our service, remember your preferences, and
				understand how the platform is used. You can accept all or reject
				non-essential cookies at any time. See our{' '}
				<Link href="/privacy" className="underline">
					Privacy Policy
				</Link>
				.
			</p>
			<div className="mt-3 flex justify-end gap-2">
				<Button
					onClick={reject}
					variant="outline"
					size="sm"
					className="cursor-pointer"
				>
					Reject
				</Button>
				<Button onClick={accept} size="sm" className="cursor-pointer">
					Accept
				</Button>
			</div>
		</div>
	);
}
