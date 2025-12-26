'use server';

import type { SignUpInput } from '@/types/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export async function registerUser(input: SignUpInput) {
	try {
		const response = await fetch(`${BACKEND_URL}/api/auth/sign-up/email`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(input),
		});

		if (!response.ok) {
			const error = await response.json();
			return { error: error.message || 'Sign up failed' };
		}

		const data = await response.json();

		return { success: !!data.user };
	} catch {
		return { error: 'Network error. Please try again.' };
	}
}
