import { stripMarkdown } from '@/lib/utils/strip-markdown';
import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'audio/mp3'];

/**
 * Schema for edit-mode field restrictions
 * Determines which fields should be disabled based on raffle state
 */
export const fieldRestrictionsSchema = z.object({
	/** Start date locked if raffle is live or has participants */
	startDateLocked: z.boolean(),
	/** Ticket price locked if any tickets have been sold (participantsCount > 0) */
	priceLocked: z.boolean(),
});

export type FieldRestrictions = z.infer<typeof fieldRestrictionsSchema>;

const fileSchema = z
	.instanceof(File)
	.refine(file => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
	.refine(
		file => ACCEPTED_IMAGE_TYPES.includes(file.type),
		'Only PNG, JPEG and MP3 files are accepted',
	);

/**
 * Edit form schema
 * Similar to create form but for editing existing raffles
 */
export const editFormSchema = z
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
					.min(0, 'Max participants cannot be negative')
					.max(1_000_000, 'Max participants cannot exceed 1,000,000'),
			),
		checkInQuestion: z.string().min(1, 'Check-in question is required'),
	})
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
	// minParticipants must exceed numberOfWinners when enabled (non-zero)
	// Backend enforces this — replicate client-side for proactive feedback
	.refine(
		data => {
			if (data.minParticipants === 0) return true;
			return data.minParticipants > data.numberOfWinners;
		},
		{
			message:
				'Minimum participants must be greater than the number of winners, or set to 0 to disable',
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

export type EditFormData = z.infer<typeof editFormSchema>;
