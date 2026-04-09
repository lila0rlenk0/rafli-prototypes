import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIES } from './lib/auth/config';
import { isJwtExpired } from './lib/auth/jwt';

/** Redirect target when unauthenticated user hits a protected route */
const SIGN_IN_PATH = '/sign-in';

/** Redirect target when authenticated user hits an auth route */
const DEFAULT_AUTHENTICATED_PATH = '/browse';

/**
 * Protected routes that require authentication.
 * /browse is intentionally NOT protected — it's publicly accessible.
 */
const protectedRoutes: readonly string[] = [
	'/my-raffles',
	'/profile',
	'/admin',
	'/verification',
];

/**
 * Auth routes that should redirect to /browse if user is already authenticated.
 * Prevents authenticated users from seeing sign-in/sign-up pages.
 */
const authRoutes: readonly string[] = [
	SIGN_IN_PATH,
	'/sign-up',
	'/forgot-password',
	'/reset-password',
];

/**
 * Next.js 16 proxy function for route protection and authentication flows.
 *
 * SECURITY NOTE: `isJwtExpired()` decodes the JWT payload without signature
 * verification. This is intentional — the proxy is a UX-only guard (redirect
 * unauthenticated users to sign-in, redirect authenticated users away from
 * auth pages). The backend enforces real auth on every API call. A crafted JWT
 * with a future `exp` can access protected route HTML, but no data is leaked
 * because API calls still fail without a valid signature.
 *
 * @param request - NextRequest object from Next.js
 * @returns NextResponse with appropriate redirect or continuation
 */
export default function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get(AUTH_COOKIES.TOKEN)?.value;

	// Step 1: Determine auth state — token exists and is not expired
	const hasValidToken = token !== undefined && !isJwtExpired(token);

	// Step 2: Classify the route
	const isProtectedRoute = protectedRoutes.some(route =>
		pathname.startsWith(route),
	);
	const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

	// Step 3: Redirect unauthenticated users away from protected routes
	if (isProtectedRoute && !hasValidToken) {
		return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
	}

	// Step 4: Redirect authenticated users away from auth pages
	// (prevents seeing sign-in after already being signed in)
	if (isAuthRoute && hasValidToken) {
		return NextResponse.redirect(
			new URL(DEFAULT_AUTHENTICATED_PATH, request.url),
		);
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
