import { type NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIES } from '@/lib/auth/constants';
import { isJwtExpired } from '@/lib/auth/jwt';
import { getProxyRedirectPath } from '@/lib/auth/proxy-routing';

/**
 * Next.js 16 proxy function for route protection and authentication flows.
 *
 * SECURITY NOTE: `isJwtExpired()` decodes the JWT payload without signature
 * verification. This is intentional — the proxy is a UX-only guard that only
 * redirects unauthenticated users to sign-in for protected pages. Auth pages
 * perform their own `/me` checks before bouncing users away, because a stale
 * but unexpired token must still be allowed to reach sign-in. The backend
 * enforces real auth on every API call. A crafted JWT with a future `exp` can
 * access protected route HTML, but no data is leaked because API calls still
 * fail without a valid signature.
 *
 * @param request - NextRequest object from Next.js
 * @returns NextResponse with appropriate redirect or continuation
 */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get(AUTH_COOKIES.TOKEN)?.value;

	// Step 1: Determine auth state — token exists and is not expired
	const hasValidToken = token !== undefined && !isJwtExpired(token);
	const redirectPath = getProxyRedirectPath({ pathname, hasValidToken });
	if (redirectPath !== null) {
		return NextResponse.redirect(new URL(redirectPath, request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization)
		 * - favicon.ico, etc.
		 */
		'/((?!api|_next/static|_next/image|favicon.ico).*)',
	],
};
