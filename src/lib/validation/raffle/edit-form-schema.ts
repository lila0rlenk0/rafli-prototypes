import { z } from 'zod';

import { stripMarkdown } from '@/lib/utils/format/strip-markdown';
import { cryptoFormFields } from '@/lib/validation/raffle/create-form-schema';
import {
	MAX_FILE_SIZE,
	raffleImageFileSchema,
} from '@/lib/validation/raffle/form-file-schema';

export { MAX_FILE_SIZE };

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
		coverImage: z.array(raffleImageFileSchema).optional(),

		// Step 2: Active time period & Tickets
		startDate: z.string().min(1, 'Start date is required'),
		startTime: z.string().min(1, 'Start time is required'),
		endDate: z.string().min(1, 'End date is required'),
		endTime: z.string().min(1, 'End time is required'),
		pricePerTicket: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(z.number().min(0.5, 'Price per entry must be at least 0.5')),
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

		// Step 2: Crypto payment config
		...cryptoFormFields,
	})
	.refine(
		data => {
			if (!data.startDate || !data.endDate) return true;

			// Build full datetime from date + time for accurate comparison
			const [sy, sm, sd] = data.startDate.split('-').map(Number);
			const [sh, smin] = (data.startTime || '00:00').split(':').map(Number);
			const start = new Date(sy, sm - 1, sd, sh, smin);

			const [ey, em, ed] = data.endDate.split('-').map(Number);
			const [eh, emin] = (data.endTime || '00:00').split(':').map(Number);
			const end = new Date(ey, em - 1, ed, eh, emin);

			// Minimum 24 hours between start and end
			const MS_PER_DAY = 86_400_000;
			return end.getTime() - start.getTime() >= MS_PER_DAY;
		},
		{
			message: 'End date must be at least 24 hours after start date',
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
	);

export type EditFormData = z.infer<typeof editFormSchema>;
