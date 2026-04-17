import { z } from 'zod';

import { stripMarkdown } from '@/lib/utils/strip-markdown';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const fileSchema = z
	.instanceof(File)
	.refine(file => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
	.refine(
		file => ACCEPTED_IMAGE_TYPES.includes(file.type),
		'Only PNG, JPEG, and WebP files are accepted',
	);

/**
 * Schema for update form validation
 * Requires text (1-5000 chars markdown), optional images (max 5)
 */
export const updateFormSchema = z.object({
	text: z
		.string()
		.refine(
			val => {
				const plainText = stripMarkdown(val);
				return plainText.length >= 1;
			},
			{
				message: 'Update text is required',
			},
		)
		.refine(
			val => {
				const plainText = stripMarkdown(val);
				return plainText.length <= 5_000;
			},
			{
				message: 'Update text must be less than 5000 characters',
			},
		),
	images: z.array(fileSchema).max(5, 'Maximum 5 images allowed').optional(),
});

export type UpdateFormData = z.infer<typeof updateFormSchema>;
