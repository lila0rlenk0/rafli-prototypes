import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIES } from './lib/auth/config';
import { isJwtExpired } from './lib/auth/jwt';

/**
 * Protected routes that require authentication
 * Note: /browse is intentionally NOT protected - it's publicly accessible
 */
const protectedRoutes = ['/my-raffles', '/profile', '/admin', '/verification'];

/**
 * Auth routes that should redirect to /browse if user is already authenticated
 */
const authRoutes = [
	'/sign-in',
	'/sign-up',
	'/forgot-password',
	'/reset-password',
];

/**
 * Proxy function for route protection and authentication flows
 * Implements JWT-based authentication and route protection for Next.js 16
 *
 * @param request - NextRequest object from Next.js
 * @returns NextResponse with appropriate redirect or continuation
 */
export default function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get(AUTH_COOKIES.TOKEN)?.value;

	// Check if token exists and is valid (not expired)
	const hasValidToken = token && !isJwtExpired(token);

	// Check if route is protected
	const isProtectedRoute = protectedRoutes.some(route =>
		pathname.startsWith(route),
	);

	// Check if route is an auth route (sign-in, sign-up, etc)
	const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

	// Redirect to sign-in if accessing protected route without valid token
	if (isProtectedRoute && !hasValidToken) {
		return NextResponse.redirect(new URL('/sign-in', request.url));
	}

	// Redirect to browse if accessing auth route WITH valid token
	// This prevents authenticated users from seeing sign-in/sign-up pages
	if (isAuthRoute && hasValidToken) {
		return NextResponse.redirect(new URL('/browse', request.url));
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
