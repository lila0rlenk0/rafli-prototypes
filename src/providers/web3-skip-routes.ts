/**
 * Route prefixes that never use wallet connectivity.
 *
 * Mounting `WagmiProvider` + `RainbowKitProvider` on these routes swaps
 * the subtree shape once the lazy wagmi config resolves, which is the
 * suspected root cause of the rare `Rendered more hooks than during the
 * previous render` crash on `/admin/verification` (Sentry RAFLI-P).
 * Skipping the load on these routes keeps the provider tree stable.
 *
 * Keep this list small — every prefix here forfeits wallet features for
 * users who open the route directly.
 *
 * Split into its own module (instead of living inside web3-provider.tsx)
 * so unit tests can exercise the pure gate without importing the
 * wagmi/env chain — `@/lib/web3/constants` pulls in `@/env/client`,
 * which fails validation outside a build that has NEXT_PUBLIC_* set.
 */
const WEB3_SKIP_PREFIXES: readonly string[] = ['/admin'];

/**
 * Pure predicate — `true` when the pathname matches one of the wallet-
 * free prefixes at a path-segment boundary. Matches the full prefix
 * (e.g. `/admin`) or the prefix followed by `/` (e.g. `/admin/...`), so
 * a future route named `/adminish` is NOT swept up by the `/admin`
 * guard.
 *
 * @param pathname - The current App Router pathname
 * @returns whether Web3 should be skipped for the pathname
 */
export function shouldSkipWeb3(pathname: string | null): boolean {
	if (!pathname) return false;
	return WEB3_SKIP_PREFIXES.some(
		prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}
