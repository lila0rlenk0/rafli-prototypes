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

	test('redirects authenticated users away from auth routes to browse', () => {
		const redirectPath = getProxyRedirectPath({
			pathname: '/sign-in',
			hasValidToken: true,
		});

		expect(redirectPath).toBe('/browse');
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
});
