import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { AuthUser } from '@/types/auth';

import * as preMockAuthSession from '@/lib/auth/session';
import * as preMockNextNavigation from 'next/navigation';

const mockGetCurrentUser = mock<() => Promise<AuthUser | null>>(
	async () => null,
);
const mockRedirect = mock((_url: string) => {});

mock.module('@/lib/auth/session', () => ({
	...preMockAuthSession,
	getCurrentUser: mockGetCurrentUser,
}));

mock.module('next/navigation', () => ({
	...preMockNextNavigation,
	redirect: mockRedirect,
}));

const { default: LoginPage } = await import('@/app/(auth)/sign-in/page');

afterAll(() => {
	mock.module('@/lib/auth/session', () => preMockAuthSession);
	mock.module('next/navigation', () => preMockNextNavigation);
});

describe('Sign-in page redirect recovery', () => {
	beforeEach(() => {
		mockGetCurrentUser.mockReset();
		mockRedirect.mockReset();
	});

	test('redirects authenticated users to a validated returnTo path', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({
			id: 'u1',
			email: 'x@example.com',
			emailVerified: true,
			name: 'x',
			image: null,
			permissions: [],
		});

		await LoginPage({
			searchParams: Promise.resolve({ returnTo: '/my-raffles' }),
		});

		expect(mockRedirect).toHaveBeenCalledWith('/my-raffles');
	});

	test('falls back to /browse for unsafe returnTo values', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({
			id: 'u1',
			email: 'x@example.com',
			emailVerified: true,
			name: 'x',
			image: null,
			permissions: [],
		});

		await LoginPage({
			searchParams: Promise.resolve({ returnTo: 'https://evil.example' }),
		});

		expect(mockRedirect).toHaveBeenCalledWith('/browse');
	});

	test('renders sign-in shell when user is not authenticated', async () => {
		mockGetCurrentUser.mockResolvedValueOnce(null);

		const result = await LoginPage({
			searchParams: Promise.resolve({}),
		});

		expect(mockRedirect).not.toHaveBeenCalled();
		expect(result).toBeDefined();
	});
});
