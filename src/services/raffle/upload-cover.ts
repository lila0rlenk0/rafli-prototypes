'use server';

import { env } from '@/env/client';
import { getAuthToken } from '@/lib/auth/session';
import { uploadCoverResponseSchema } from '@/types/raffle';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadCover(raffleId: string, file: File) {
	try {
		if (!ACCEPTED_TYPES.includes(file.type)) {
			return { error: 'Invalid file type. Use PNG, JPEG or WebP' };
		}

		if (file.size > MAX_SIZE) {
			return { error: 'File too large. Maximum size is 5MB' };
		}

		const token = await getAuthToken();

		if (!token) {
			return { error: 'You must be signed in to upload images' };
		}

		const formData = new FormData();
		// Backend expects 'file' field for single upload
		formData.append('file', file);

		const response = await fetch(
			`${env.NEXT_PUBLIC_BACKEND_URL}/raffles/${raffleId}/cover`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			},
		);

		if (!response.ok) {
			return { error: 'Failed to upload image. Please try again' };
		}

		const data = await response.json();
		const parsed = uploadCoverResponseSchema.parse(data);

		return {
			success: true,
			coverMediaUrl: parsed.coverMediaUrl,
		};
	} catch (error) {
		console.error('Upload cover error:', error);
		return { error: 'Something went wrong while uploading' };
	}
}
