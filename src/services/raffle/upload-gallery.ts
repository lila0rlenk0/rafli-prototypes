'use server';

import { env } from '@/env/client';
import { getAuthToken } from '@/lib/auth/session';
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

		const token = await getAuthToken();

		if (!token) {
			return { error: 'You must be signed in to upload images' };
		}

		const formData = new FormData();
		// Backend expects multiple 'files' fields
		files.forEach(file => {
			formData.append('files', file);
		});

		const response = await fetch(
			`${env.NEXT_PUBLIC_BACKEND_URL}/raffles/${raffleId}/gallery`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			},
		);

		if (!response.ok) {
			return { error: 'Failed to upload images. Please try again' };
		}

		const data = await response.json();
		const parsed = uploadGalleryResponseSchema.parse(data);

		return {
			success: true,
			galleryMediaUrls: parsed.galleryMediaUrls,
		};
	} catch (error) {
		console.error('Upload gallery error:', error);
		return { error: 'Something went wrong while uploading' };
	}
}
