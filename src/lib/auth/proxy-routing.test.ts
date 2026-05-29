import { describe, expect, test } from 'bun:test';

import { getProxyRedirectPath } from './proxy-routing';

describe('getProxyRedirectPath', () => {
	test('redirects unauthenticated users from protected routes to sign-in', () => {
		const redirectPath = getProxyRedirectPath({
			pathname: '/my-raffles',
			hasValidToken: false,
		});

		expect(redirectPath).toBe('/sign-in');
	});

	test('allows authenticated users on protected routes', () => {
		const redirectPath = getProxyRedirectPath({
			pathname: '/profile',
			hasValidToken: true,
		});

		expect(redirectPath).toBeNull();
	});

	test('allows sign-in route even with a valid-looking token', () => {
		const redirectPath = getProxyRedirectPath({
			pathname: '/sign-in',
			hasValidToken: true,
		});

		expect(redirectPath).toBeNull();
	});

	test('allows auth routes to perform authoritative server auth checks', () => {
		expect(
			getProxyRedirectPath({
				pathname: '/verify-email',
				hasValidToken: true,
			}),
		).toBeNull();
		expect(
			getProxyRedirectPath({
				pathname: '/auth/callback',
				hasValidToken: true,
			}),
		).toBeNull();
		expect(
			getProxyRedirectPath({
				pathname: '/auth/resend-verification',
				hasValidToken: true,
			}),
		).toBeNull();
	});

	test('allows unauthenticated users on auth routes', () => {
		const redirectPath = getProxyRedirectPath({
			pathname: '/reset-password',
			hasValidToken: false,
		});

		expect(redirectPath).toBeNull();
	});

	test('allows public routes for all users', () => {
		expect(
			getProxyRedirectPath({
				pathname: '/browse',
				hasValidToken: false,
			}),
		).toBeNull();
		expect(
			getProxyRedirectPath({
				pathname: '/browse',
				hasValidToken: true,
			}),
		).toBeNull();
	});

	test('does not treat shared prefixes as protected routes', () => {
		const redirectPath = getProxyRedirectPath({
			pathname: '/profiles',
			hasValidToken: false,
		});

		expect(redirectPath).toBeNull();
	});

	test('lets every visitor view the /subscribe-* tier landings', () => {
		// Marketing landings are public for everyone: anonymous buyers go
		// through the email-capture funnel, signed-in members preview the
		// tier copy before bouncing into /pricing themselves.
		for (const pathname of [
			'/subscribe-basic',
			'/subscribe-starter',
			'/subscribe-pro',
		]) {
			expect(
				getProxyRedirectPath({ pathname, hasValidToken: false }),
			).toBeNull();
			expect(
				getProxyRedirectPath({ pathname, hasValidToken: true }),
			).toBeNull();
		}
	});
});
