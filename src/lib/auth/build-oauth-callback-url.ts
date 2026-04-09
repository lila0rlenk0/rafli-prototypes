/**
 * Builds the OAuth callback URL while preserving `returnTo`.
 *
 * Kept as a shared helper so sign-in and sign-up flows cannot diverge.
 *
 * @param origin - The app origin (e.g. "https://app.example.com")
 * @param returnTo - The path to redirect back to after OAuth
 * @returns Full callback URL with encoded returnTo query param
 */
export function buildOAuthCallbackUrl(
	origin: string,
	returnTo: string,
): string {
	return `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
}
