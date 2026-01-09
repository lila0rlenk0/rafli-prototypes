'use server';

import { AxiosError } from 'axios';

import { baseClient } from '@/lib/api/client';
import type { SignUpInput } from '@/types/auth';

export async function registerUser(input: SignUpInput) {
	try {
		const response = await baseClient.post('/api/auth/sign-up/email', input);

		return { success: !!response.data.user };
	} catch (error) {
		if (error instanceof AxiosError) {
			return {
				error: error.response?.data?.message || 'Sign up failed',
			};
		}
		return { error: 'Network error. Please try again.' };
	}
}
