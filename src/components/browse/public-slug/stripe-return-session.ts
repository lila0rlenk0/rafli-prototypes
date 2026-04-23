/**
 * Stripe appends `session_id` to our return URL. We keep the id in React state
 * while stripping the query so Referer and shared URLs do not carry `cs_*`.
 */
export function resolveStripeReturnSessionId(
	captured: string | null,
	fromSearchParams: string | undefined,
): string | null {
	return captured ?? fromSearchParams ?? null;
}
