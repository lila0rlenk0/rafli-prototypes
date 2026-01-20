import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'audio/mp3'];

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
	// Remove images ![alt](url) - though we don't support images
	text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
	// Remove links [text](url) - though we don't support links
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
	.refine(file => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
	.refine(
		file => ACCEPTED_IMAGE_TYPES.includes(file.type),
		'Only PNG, JPEG and MP3 files are accepted',
	);

export const raffleFormSchema = z
	.object({
		// Step 1: Basic Information
		title: z
			.string()
			.min(3, 'Title must be at least 3 characters')
			.max(200, 'Title must be less than 200 characters'),
		description: z
			.string()
			.refine(
				val => {
					const plainText = stripMarkdown(val);
					return plainText.length >= 10;
				},
				{
					message: 'Description must be at least 10 characters',
				},
			)
			.refine(
				val => {
					const plainText = stripMarkdown(val);
					return plainText.length <= 5_000;
				},
				{
					message: 'Description must be less than 5000 characters',
				},
			),
		price: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(z.number().min(0.5, 'Declared value must be at least 0.5')),
		category: z.string().min(1, 'Category is required'),
		coverImage: z.array(fileSchema).optional(),

		// Step 2: Active time period & Tickets
		startDate: z.string().min(1, 'Start date is required'),
		endDate: z.string().min(1, 'End date is required'),
		pricePerTicket: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(z.number().min(0.5, 'Price per ticket must be at least 0.5')),
		numberOfWinners: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(
				z
					.number()
					.int()
					.min(1, 'Number of winners must be at least 1')
					.max(100, 'Number of winners cannot exceed 100'),
			),
		minParticipants: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(z.number().int().min(0, 'Min participants cannot be negative')),
		maxParticipants: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(
				z
					.number()
					.int()
					.min(1, 'Max participants must be at least 1')
					.max(1_000_000, 'Max participants cannot exceed 1,000,000'),
			),
	})
	.refine(
		data => {
			if (!data.startDate) return true;

			// Parse the date string and normalize to local midnight
			const [year, month, day] = data.startDate.split('-').map(Number);
			const start = new Date(year, month - 1, day);

			// Get today's date normalized to local midnight
			const today = new Date();
			const todayNormalized = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
			);

			// Start date must be today or later
			return start >= todayNormalized;
		},
		{
			message: 'Start date cannot be before today',
			path: ['startDate'],
		},
	)
	.refine(
		data => {
			if (!data.endDate) return true;

			// Parse the date string and normalize to local midnight
			const [year, month, day] = data.endDate.split('-').map(Number);
			const end = new Date(year, month - 1, day);

			// Get today's date normalized to local midnight
			const today = new Date();
			const todayNormalized = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
			);

			// End date must be today or later
			return end >= todayNormalized;
		},
		{
			message: 'End date cannot be before today',
			path: ['endDate'],
		},
	)
	.refine(
		data => {
			if (!data.startDate || !data.endDate) return true;

			const start = new Date(data.startDate);
			const end = new Date(data.endDate);

			return end > start;
		},
		{
			message: 'End date must be after start date',
			path: ['endDate'],
		},
	)
	.refine(
		data => {
			if (data.minParticipants === 0 || data.maxParticipants === 0) return true;

			return data.minParticipants <= data.maxParticipants;
		},
		{
			message: 'Min participants cannot be greater than max participants',
			path: ['minParticipants'],
		},
	)
	// TODO: Temporary rule - minimum 30 days gap between start and end
	// Remove this validation when no longer needed
	.refine(
		data => {
			if (!data.startDate || !data.endDate) return true;

			const start = new Date(data.startDate);
			const end = new Date(data.endDate);
			const diffTime = end.getTime() - start.getTime();
			const diffDays = diffTime / (1000 * 60 * 60 * 24);

			return diffDays >= 30;
		},
		{
			message: 'There must be at least 30 days between start and end date',
			path: ['endDate'],
		},
	);

export type RaffleFormData = z.infer<typeof raffleFormSchema>;

/**
 * Schema for raffle draft data stored in localStorage
 * Excludes coverImage since File[] cannot be serialized
 */
export const raffleDraftSchema = z.object({
	title: z.string(),
	description: z.string(),
	price: z.number(),
	category: z.string(),
	startDate: z.string(),
	endDate: z.string(),
	pricePerTicket: z.number(),
	numberOfWinners: z.number(),
	minParticipants: z.number(),
	maxParticipants: z.number(),
	savedAt: z.string(),
	currentStep: z.number(),
});

export type RaffleDraftData = z.infer<typeof raffleDraftSchema>;
