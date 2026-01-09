'use server';

import { AxiosError } from 'axios';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { uploadGalleryResponseSchema } from '@/types/raffle';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 10;

export async function uploadGalleryImages(raffleId: string, files: File[]) {
	try {
		if (files.length === 0) {
			return { error: 'Please select at least one file' };
		}

		if (files.length > MAX_IMAGES) {
			return { error: `Maximum ${MAX_IMAGES} images allowed` };
		}

		// Validate each file
		for (const file of files) {
			if (!ACCEPTED_TYPES.includes(file.type)) {
				return {
					error: `Invalid file: ${file.name}. Use PNG, JPEG or WebP`,
				};
			}

			if (file.size > MAX_SIZE) {
				return {
					error: `File too large: ${file.name}. Maximum 5MB per file`,
				};
			}
		}

		const formData = new FormData();
		// Backend expects multiple 'files' fields
		files.forEach(file => {
			formData.append('files', file);
		});

		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/gallery`,
			formData,
			{
				timeout: API_TIMEOUTS.UPLOAD,
				headers: {
					// Axios detects FormData and sets Content-Type automatically
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		const parsed = uploadGalleryResponseSchema.parse(response.data);

		return {
			success: true,
			galleryMediaUrls: parsed.galleryMediaUrls,
		};
	} catch (error) {
		if (error instanceof AxiosError) {
			if (error.code === 'ECONNABORTED') {
				return { error: 'Upload timeout. Files may be too large.' };
			}
			return {
				error: error.response?.data?.message || 'Failed to upload images',
			};
		}
		console.error('Upload gallery error:', error);
		return { error: 'Something went wrong while uploading' };
	}
}
