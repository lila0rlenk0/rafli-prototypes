import * as Sentry from '@sentry/nextjs';

/**
 * Valid values for the `userMode` Sentry tag. Kept as a local union so
 * this file doesn't import `@/types/user-mode` — the tag is a telemetry
 * label, not part of the domain model, and keeping the dependency tree
 * shallow matters because `@/lib/auth/session` imports this file at the
 * very start of every request.
 */
export type SentryUserMode = 'participant' | 'host';

/**
 * Writes the `userMode` tag to the current Sentry scope. Callers pass a
 * pre-resolved string so this helper stays synchronous and free of
 * cookie/server dependencies.
 *
 * The tag is indexed in Sentry so the issue list can be filtered by
 * `userMode:host` to distinguish host-only failure modes from
 * participant-only ones — the two flows share most service actions but
 * hit different backend permissions, so separating them is valuable.
 *
 * @param mode - Resolved user mode from the `raffly-user-mode` cookie
 */
export function setSentryUserMode(mode: SentryUserMode): void {
	Sentry.setTag('userMode', mode);
}

/**
 * Sets user context on all subsequent Sentry events.
 *
 * Only sends user ID — no PII (email, name) to minimize data exposure.
 * On the server runtime this writes to the current isolation scope, which
 * AsyncLocalStorage keeps per-request. On the client this writes to the
 * browser-wide scope for the page session.
 *
 * Call after successful authentication (sign-in, OAuth callback) or from
 * any code path that has authoritatively identified the current user — the
 * canonical server entry point is `getSession()`, which attaches the user
 * automatically so every page and server action gets correct attribution.
 *
 * @param userId - Authenticated user's ID
 */
export function setSentryUser(userId: string): void {
	Sentry.setUser({ id: userId });
}

/**
 * Clears user context from Sentry scope.
 *
 * Call on sign-out so post-logout errors aren't attributed to the previous
 * user. On the server runtime this clears the current isolation scope;
 * subsequent requests start fresh.
 */
export function clearSentryUser(): void {
	Sentry.setUser(null);
}

/**
 * Attempts to read the authenticated user's ID from `document.cookie` on
 * the browser. The `raffly-session` cookie stores a JSON-encoded user
 * object with `httpOnly: false` specifically so the client can hydrate
 * display state without a server round-trip — we reuse that surface to
 * tag client-side Sentry events with the correct user.
 *
 * Returns `null` in SSR (no `document`), when the cookie is absent, or
 * when parsing fails. Never throws — telemetry should never crash the UI.
 *
 * Must stay in sync with `AUTH_COOKIES.SESSION` in `@/lib/auth/config`,
 * which can't be imported here because this file is imported by the
 * Sentry client bootstrap and we want zero-cost dependencies during
 * SDK init. The cookie key is declared inline for that reason.
 *
 * @returns user ID when a session cookie is present, otherwise `null`
 */
export function getClientUserId(): string | null {
	// Cookie name is duplicated intentionally — see JSDoc above.
	const SESSION_COOKIE = 'raffly-session';

	if (typeof document === 'undefined') return null;

	try {
		const raw = document.cookie
			.split('; ')
			.find(entry => entry.startsWith(`${SESSION_COOKIE}=`));

		if (!raw) return null;

		const value = decodeURIComponent(raw.slice(SESSION_COOKIE.length + 1));
		const parsed: unknown = JSON.parse(value);

		if (
			parsed &&
			typeof parsed === 'object' &&
			'id' in parsed &&
			typeof (parsed as { id: unknown }).id === 'string'
		) {
			return (parsed as { id: string }).id;
		}

		return null;
	} catch {
		// Malformed cookie, quota errors, or a browser that blocks document.cookie
		// access — treat as unauthenticated rather than throwing.
		return null;
	}
}
