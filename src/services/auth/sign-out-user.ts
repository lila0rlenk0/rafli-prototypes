'use server';

import { redirect } from 'next/navigation';

import { authenticatedClient } from '@/lib/api/client';
import { clearAuthCookies } from './clear-auth';

export async function signOutUser() {
	try {
		await authenticatedClient.post('/api/auth/sign-out');
	} catch (error) {
		// Ignore errors and clear cookies anyway
		console.error('Sign out error:', error);
	} finally {
		// Always clear auth cookies regardless of backend response
		await clearAuthCookies();
	}

	// Redirect to sign-in page
	redirect('/sign-in');
}
