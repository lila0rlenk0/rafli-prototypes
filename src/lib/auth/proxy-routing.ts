const SIGN_IN_PATH = '/sign-in';

const protectedRoutes: readonly string[] = [
	'/my-raffles',
	'/messages',
	'/profile',
	'/admin',
	'/verification',
];

export interface ProxyRouteDecisionInput {
	pathname: string;
	hasValidToken: boolean;
}

function matchesRoute(pathname: string, route: string): boolean {
	return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Pure redirect decision for route protection.
 *
 * Keeping this helper framework-agnostic avoids Next.js runtime coupling in
 * tests and lets route-access rules stay explicit in one place.
 *
 * @param input - Current pathname and precomputed auth state
 * @returns Redirect path if request should redirect, otherwise null
 */
export function getProxyRedirectPath(
	input: ProxyRouteDecisionInput,
): string | null {
	const { pathname, hasValidToken } = input;
	const isProtectedRoute = protectedRoutes.some(route =>
		matchesRoute(pathname, route),
	);

	if (isProtectedRoute && !hasValidToken) {
		return SIGN_IN_PATH;
	}

	return null;
}
