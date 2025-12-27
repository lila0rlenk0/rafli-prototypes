import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'audio/mp3'];

const fileSchema = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_FILE_SIZE, 'File size must be less than 10MB')
	.refine(
		(file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
		'Only PNG, JPEG and MP3 files are accepted'
	);

export const raffleFormSchema = z.object({
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

	// You can add more fields for other steps here
	// Step 2: Details (example)
	// startDate: z.date().optional(),
	// endDate: z.date().optional(),
	// maxTickets: z.number().optional(),
});

export type RaffleFormData = z.infer<typeof raffleFormSchema>;
