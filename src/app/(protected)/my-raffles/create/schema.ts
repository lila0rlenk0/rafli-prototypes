import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'audio/mp3'];

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
			.min(10, 'Description must be at least 10 characters')
			.max(5_000, 'Description must be less than 5000 characters'),
		price: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(z.number().min(0.01, 'Price must be greater than 0')),
		category: z.string().min(1, 'Category is required'),
		coverImage: z.array(fileSchema).optional(),

		// Step 2: Active time period & Tickets
		startDate: z.string().min(1, 'Start date is required'),
		endDate: z.string().min(1, 'End date is required'),
		pricePerTicket: z
			.number()
			.or(z.nan())
			.transform(val => (isNaN(val) ? 0 : val))
			.pipe(z.number().min(0.01, 'Price per ticket must be greater than 0')),
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
	);

export type RaffleFormData = z.infer<typeof raffleFormSchema>;
