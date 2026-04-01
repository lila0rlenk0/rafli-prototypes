import type {
	Raffle,
	TokenPricingEntry,
	UpdateRafflePayload,
} from '@/types/raffle';

import { extractCryptoFormFields } from './crypto-form';

/**
 * Form data structure for edit form
 */
interface EditFormData {
	title: string;
	description: string;
	price: number;
	category: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	pricePerTicket: number;
	numberOfWinners: number;
	minParticipants: number;
	maxParticipants: number;
	checkInQuestion: string;
	// Crypto config
	acceptsCrypto: boolean;
	cryptoChainIds: number[];
	cryptoTokens: string[];
	cryptoTokenPricing: TokenPricingEntry[];
}

/**
 * Computes the diff between original raffle data and current form data
 * Returns only the fields that have changed for partial update
 *
 * @param original - The original raffle from the API
 * @param current - The current form data
 * @param categoryId - The category ID resolved from the category name
 * @param checkInQuestionId - The check-in question ID resolved from the question value
 * @returns UpdateRafflePayload with only changed fields
 */
export function computeRaffleDiff(
	original: Raffle,
	current: EditFormData,
	categoryId: string,
	checkInQuestionId: string,
): UpdateRafflePayload {
	const diff: UpdateRafflePayload = {};

	// Compare title
	if (current.title !== original.title) {
		diff.title = current.title;
	}

	// Compare description
	if (current.description !== original.description) {
		diff.description = current.description;
	}

	// Compare declared value (convert form number to string for comparison)
	const currentDeclaredValue = current.price.toString();
	if (currentDeclaredValue !== original.declaredValueAmount) {
		diff.declaredValueAmount = currentDeclaredValue;
	}

	// Compare category
	if (categoryId !== original.categoryId) {
		diff.categoryId = categoryId;
	}

	// Compare start datetime — form stores date (YYYY-MM-DD) + time (HH:mm) separately.
	// Combine into a local datetime string and compare against the original ISO.
	const currentStartISO = new Date(
		`${current.startDate}T${current.startTime || '00:00'}`,
	).toISOString();
	if (currentStartISO !== original.startAt) {
		diff.startAt = currentStartISO;
	}

	// Compare end datetime — same strategy as start
	const currentEndISO = new Date(
		`${current.endDate}T${current.endTime || '00:00'}`,
	).toISOString();
	if (currentEndISO !== original.endAt) {
		diff.endAt = currentEndISO;
	}

	// Compare ticket price
	const currentTicketPrice = current.pricePerTicket.toString();
	if (currentTicketPrice !== original.ticketPriceAmount) {
		diff.ticketPriceAmount = currentTicketPrice;
	}

	// Compare number of winners
	if (current.numberOfWinners !== original.numberOfWinners) {
		diff.numberOfWinners = current.numberOfWinners;
	}

	// Compare min participants
	if (current.minParticipants !== original.minParticipants) {
		diff.minParticipants = current.minParticipants;
	}

	// Compare max participants
	if (current.maxParticipants !== original.maxParticipants) {
		diff.maxParticipants = current.maxParticipants;
	}

	// Compare check-in question
	const originalQuestionId = original.questionId || '';
	if (checkInQuestionId !== originalQuestionId) {
		diff.questionId = checkInQuestionId;
	}

	// Compare crypto config — extract original values from cryptoOptions
	const originalCrypto = extractCryptoFormFields(original.cryptoOptions);

	if (current.acceptsCrypto !== originalCrypto.acceptsCrypto) {
		diff.acceptsCrypto = current.acceptsCrypto;
	}

	// Compare chain IDs (sorted for stable comparison)
	const currentChainIds = [...current.cryptoChainIds].sort();
	const originalChainIds = [...originalCrypto.cryptoChainIds].sort();
	if (JSON.stringify(currentChainIds) !== JSON.stringify(originalChainIds)) {
		diff.cryptoChainIds = current.cryptoChainIds;
	}

	// Compare token IDs (sorted for stable comparison)
	const currentTokenIds = [...current.cryptoTokens].sort();
	const originalTokenIds = [...originalCrypto.cryptoTokens].sort();
	if (JSON.stringify(currentTokenIds) !== JSON.stringify(originalTokenIds)) {
		diff.cryptoTokens = current.cryptoTokens;
	}

	// Compare token pricing (sorted by tokenId for stable comparison)
	const currentPricing = [...current.cryptoTokenPricing].sort((a, b) =>
		a.tokenId.localeCompare(b.tokenId),
	);
	const originalPricing = [...originalCrypto.cryptoTokenPricing].sort((a, b) =>
		a.tokenId.localeCompare(b.tokenId),
	);
	if (JSON.stringify(currentPricing) !== JSON.stringify(originalPricing)) {
		diff.cryptoTokenPricing = current.cryptoTokenPricing;
	}

	return diff;
}

/**
 * Checks if there are any changes between the original raffle and current form data
 *
 * @param original - The original raffle from the API
 * @param current - The current form data
 * @param categoryId - The category ID resolved from the category name
 * @param checkInQuestionId - The check-in question ID resolved from the question value
 * @returns true if there are changes, false otherwise
 */
export function hasRaffleChanges(
	original: Raffle,
	current: EditFormData,
	categoryId: string,
	checkInQuestionId: string,
): boolean {
	const diff = computeRaffleDiff(
		original,
		current,
		categoryId,
		checkInQuestionId,
	);
	return Object.keys(diff).length > 0;
}
