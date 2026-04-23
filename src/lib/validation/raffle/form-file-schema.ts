import { z } from 'zod';

/** Cover + gallery uploads — 5 MB cap, image types only */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const raffleImageFileSchema = z
	.instanceof(File)
	.refine(file => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
	.refine(
		file => ACCEPTED_IMAGE_TYPES.includes(file.type),
		'Only PNG, JPEG and WebP files are accepted',
	);
