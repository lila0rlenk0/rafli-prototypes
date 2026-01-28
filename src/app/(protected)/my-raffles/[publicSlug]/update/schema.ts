import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Removes markdown formatting and returns plain text
 * Used for character count validation
 */
function stripMarkdown(markdown: string): string {
	if (!markdown) return '';

	let text = markdown;

	// Remove code blocks (```code```)
	text = text.replace(/```[\s\S]*?```/g, '');
	// Remove inline code (`code`)
	text = text.replace(/`[^`]*`/g, '');
	// Remove headers (# ## ### #### ##### ######)
	text = text.replace(/^#{1,6}\s+/gm, '');
	// Remove horizontal rules (--- *** ___)
	text = text.replace(/^[-*_]{3,}\s*$/gm, '');
	// Remove blockquotes (>)
	text = text.replace(/^>\s+/gm, '');
	// Remove list markers (- * +) and numbered lists (1. 2. etc)
	text = text.replace(/^[\s]*[-*+]\s+/gm, '');
	text = text.replace(/^[\s]*\d+\.\s+/gm, '');
	// Remove task list markers (- [ ] - [x])
	text = text.replace(/^[\s]*[-*+]\s+\[[ xX]\]\s+/gm, '');
	// Remove bold (**text** or __text__)
	text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
	text = text.replace(/__([^_]+)__/g, '$1');
	// Remove italic (*text* or _text_)
	text = text.replace(/\*([^*]+)\*/g, '$1');
	text = text.replace(/_([^_]+)_/g, '$1');
	// Remove strikethrough (~~text~~)
	text = text.replace(/~~([^~]+)~~/g, '$1');
	// Remove images ![alt](url)
	text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
	// Remove links [text](url)
	text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
	// Remove reference-style links [text][ref]
	text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
	// Remove reference definitions [ref]: url
	text = text.replace(/^\[[^\]]+\]:\s*.*$/gm, '');
	// Remove HTML tags if any
	text = text.replace(/<[^>]+>/g, '');
	// Remove multiple spaces and normalize whitespace
	text = text.replace(/\s+/g, ' ');
	// Remove leading/trailing whitespace from each line
	text = text
		.split('\n')
		.map(line => line.trim())
		.join('\n');
	// Remove multiple consecutive newlines
	text = text.replace(/\n{3,}/g, '\n\n');
	// Trim final result
	text = text.trim();

	return text;
}

const fileSchema = z
	.instanceof(File)
	.refine(
		file => file.size <= MAX_FILE_SIZE,
		'File size must be less than 5MB',
	)
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
