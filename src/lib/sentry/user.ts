import * as Sentry from '@sentry/nextjs';

/**
 * Sets user context on all subsequent Sentry events.
 * Only sends user ID — no PII (email, name) to minimize data exposure.
 *
 * Call after successful authentication (sign-in, OAuth callback).
 *
 * @param userId - Authenticated user's ID
 */
export function setSentryUser(userId: string): void {
	Sentry.setUser({ id: userId });
}

/**
 * Clears user context from Sentry scope.
 * Call on sign-out so post-logout errors aren't attributed to the previous user.
 */
export function clearSentryUser(): void {
	Sentry.setUser(null);
}
