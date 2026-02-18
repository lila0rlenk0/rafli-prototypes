/**
 * Builds the OAuth callback URL while preserving `returnTo`.
 *
 * Kept as a shared helper so sign-in and sign-up flows cannot diverge.
 */
export function buildOAuthCallbackUrl(
	origin: string,
	returnTo: string,
): string {
	return `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
}
