'use server';

import { AxiosError } from 'axios';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
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

		const formData = new FormData();
		// Backend expects 'file' field for single upload
		formData.append('file', file);

		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/cover`,
			formData,
			{
				timeout: API_TIMEOUTS.UPLOAD,
				headers: {
					// Axios detects FormData and sets Content-Type automatically
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		const parsed = uploadCoverResponseSchema.parse(response.data);

		return {
			success: true,
			coverMediaUrl: parsed.coverMediaUrl,
		};
	} catch (error) {
		if (error instanceof AxiosError) {
			if (error.code === 'ECONNABORTED') {
				return { error: 'Upload timeout. File may be too large.' };
			}
			return {
				error: error.response?.data?.message || 'Failed to upload image',
			};
		}
		console.error('Upload cover error:', error);
		return { error: 'Something went wrong while uploading' };
	}
}
