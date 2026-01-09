'use server';

import { AxiosError } from 'axios';

import { baseClient } from '@/lib/api/client';
import { setAuthCookies } from '@/lib/auth/session';
import type { SignInInput } from '@/types/auth';

export async function signInUser(input: SignInInput) {
	try {
		const response = await baseClient.post('/api/auth/sign-in/email', input);

		const { token, user } = response.data;

		// Sign-in should return both token and user
		if (token && user) {
			await setAuthCookies(token, user);
			return { success: true };
		}

		return { error: 'Invalid response from server' };
	} catch (error) {
		if (error instanceof AxiosError) {
			return {
				error: error.response?.data?.message || 'Invalid credentials',
			};
		}
		return { error: 'Network error. Please try again.' };
	}
}
