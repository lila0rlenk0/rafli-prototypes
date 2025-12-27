import { AUTH_COOKIES } from '@/lib/auth/config';
import { NextRequest, NextResponse } from 'next/server';

// Define route patterns
const protectedRoutes = ['/dashboard', '/my-raffles/create', '/profile'];
const authRoutes = ['/sign-in', '/sign-up', '/forgot-password'];

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasToken = request.cookies.get(AUTH_COOKIES.TOKEN);

	// Check if route is protected
	const isProtectedRoute = protectedRoutes.some(route =>
		pathname.startsWith(route),
	);

	// Check if route is an auth route (sign-in, sign-up, etc)
	const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

	// Redirect to sign-in if accessing protected route without token
	if (isProtectedRoute && !hasToken) {
		return NextResponse.redirect(new URL('/sign-in', request.url));
	}

	// Redirect to dashboard if accessing auth route WITH token
	// This prevents authenticated users from seeing sign-in/sign-up pages
	if (isAuthRoute && hasToken) {
		return NextResponse.redirect(new URL('/dashboard', request.url));
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
