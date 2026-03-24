import { stripMarkdown } from '@/lib/utils/strip-markdown';
import { tokenPricingEntrySchema } from '@/types/raffle';
import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const fileSchema = z
	.instanceof(File)
	.refine(file => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
	.refine(
		file => ACCEPTED_IMAGE_TYPES.includes(file.type),
		'Only PNG, JPEG and WebP files are accepted',
	);

/**
 * Crypto config fields shared between create and edit form schemas.
 * Kept as a plain object so it can be spread into both `.object()` calls.
 *
 * - `acceptsCrypto` toggles the entire crypto section
 * - `cryptoChainIds` / `cryptoTokens`: empty array = "all allowed" (backend semantics)
 * - `cryptoTokenPricing`: required for each non-stablecoin in `cryptoTokens`
 */
export const cryptoFormFields = {
	acceptsCrypto: z.boolean(),
	cryptoChainIds: z.array(z.number()),
	cryptoTokens: z.array(z.string()),
	cryptoTokenPricing: z.array(tokenPricingEntrySchema),
};

/** Default values for crypto form fields */
export const CRYPTO_FORM_DEFAULTS = {
	acceptsCrypto: false,
	cryptoChainIds: [] as number[],
	cryptoTokens: [] as string[],
	cryptoTokenPricing: [] as { tokenId: string; price: string }[],
};

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
					.min(0, 'Max participants cannot be negative')
					.max(1_000_000, 'Max participants cannot exceed 1,000,000'),
			),
		checkInQuestion: z.string().min(1, 'Check-in question is required'),

		// Step 2: Crypto payment config
		...cryptoFormFields,
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
	checkInQuestion: z.string(),
	// Crypto config — serializable (no File objects)
	acceptsCrypto: z.boolean(),
	cryptoChainIds: z.array(z.number()),
	cryptoTokens: z.array(z.string()),
	cryptoTokenPricing: z.array(tokenPricingEntrySchema),
	savedAt: z.string(),
	currentStep: z.number(),
});

export type RaffleDraftData = z.infer<typeof raffleDraftSchema>;
