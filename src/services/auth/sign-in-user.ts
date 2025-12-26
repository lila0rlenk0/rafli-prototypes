'use server';

import { setAuthCookies } from '@/lib/auth/session';
import type { SignInInput } from '@/types/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export async function signInUser(input: SignInInput) {
	try {
		const response = await fetch(`${BACKEND_URL}/api/auth/sign-in/email`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(input),
		});

		if (!response.ok) {
			const error = await response.json();
			return { error: error.message || 'Invalid credentials' };
		}

		const data = await response.json();

		// Sign-in should return both token and user
		if (data.token && data.user) {
			await setAuthCookies(data.token, data.user);
			return { success: true };
		}

		return { error: 'Invalid response from server' };
	} catch {
		return { error: 'Network error. Please try again.' };
	}
}
