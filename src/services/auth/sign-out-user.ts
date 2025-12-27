'use server';

import { env } from '@/env/client';
import { AUTH_COOKIES } from '@/lib/auth/config';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearAuthCookies } from './clear-auth';

export async function signOutUser() {
	try {
		// Get token before clearing cookies
		const cookieStore = await cookies();
		const token = cookieStore.get(AUTH_COOKIES.TOKEN)?.value;

		if (token) {
			// Call backend sign-out endpoint
			await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/auth/sign-out`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
		}
	} catch (error) {
		// Ignore errors - clear cookies anyway
		console.error('Sign out error:', error);
	} finally {
		// Clear auth cookies
		await clearAuthCookies();
	}

	// Redirect to sign-in
	redirect('/sign-in');
}
