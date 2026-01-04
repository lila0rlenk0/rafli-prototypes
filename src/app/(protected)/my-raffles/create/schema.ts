import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'audio/mp3'];

export const RAFFLE_CATEGORIES = [
	{ value: 'electronics', label: 'Electronics' },
	{ value: 'wearables', label: 'Wearables' },
	{ value: 'accessories', label: 'Accessories' },
	{ value: 'home-appliances', label: 'Home Appliances' },
] as const;

const fileSchema = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_FILE_SIZE, 'File size must be less than 10MB')
	.refine(
		(file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
		'Only PNG, JPEG and MP3 files are accepted'
	);

export const raffleFormSchema = z
	.object({
		// Step 1: Basic Information
		title: z
			.string()
			.min(3, 'Title must be at least 3 characters')
			.max(100, 'Title must be less than 100 characters'),
		description: z
			.string()
			.min(10, 'Description must be at least 10 characters')
			.max(500, 'Description must be less than 500 characters'),
		price: z.number().min(0.01, 'Price must be greater than 0'),
		category: z.string().min(1, 'Category is required'),
		coverImage: z.array(fileSchema).optional(),

		// Step 2: Active time period & Tickets
		startDate: z.string().min(1, 'Start date is required'),
		endDate: z.string().min(1, 'End date is required'),
		pricePerTicket: z.number().min(0.01, 'Price per ticket must be greater than 0'),
		numberOfWinners: z.number().min(1, 'Number of winners must be at least 1'),
		minParticipants: z.number().min(1, 'Min participants must be at least 1'),
		maxParticipants: z.number().min(1, 'Max participants must be at least 1'),
	})
	.refine(
		data => {
			// Only validate if both dates are provided
			if (!data.startDate || !data.endDate) return true;

			const start = new Date(data.startDate);
			const end = new Date(data.endDate);

			return end > start;
		},
		{
			message: 'End date must be after start date',
			path: ['endDate'], // This will show the error on the endDate field
		},
	);

export type RaffleFormData = z.infer<typeof raffleFormSchema>;
