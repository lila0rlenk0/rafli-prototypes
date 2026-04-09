import type {
	Raffle,
	TokenPricingEntry,
	UpdateRafflePayload,
} from '@/types/raffle';

import { extractCryptoFormFields, type CryptoFormFields } from './crypto-form';

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
 * Diffs scalar raffle fields (title, description, price, category, dates, limits, question).
 * Extracted from computeRaffleDiff to stay under the 30-SLOC function limit.
 */
function diffScalarFields(
	original: Raffle,
	current: EditFormData,
	categoryId: string,
	checkInQuestionId: string,
): UpdateRafflePayload {
	const diff: UpdateRafflePayload = {};

	// Text fields
	if (current.title !== original.title) diff.title = current.title;
	if (current.description !== original.description)
		diff.description = current.description;

	// Numeric fields stored as strings — coerce form number to string for comparison
	const currentDeclaredValue = current.price.toString();
	if (currentDeclaredValue !== original.declaredValueAmount)
		diff.declaredValueAmount = currentDeclaredValue;

	if (categoryId !== original.categoryId) diff.categoryId = categoryId;

	// Date/time — form stores separately, combine into ISO for comparison
	const currentStartISO = new Date(
		`${current.startDate}T${current.startTime || '00:00'}`,
	).toISOString();
	if (currentStartISO !== original.startAt) diff.startAt = currentStartISO;

	const currentEndISO = new Date(
		`${current.endDate}T${current.endTime || '00:00'}`,
	).toISOString();
	if (currentEndISO !== original.endAt) diff.endAt = currentEndISO;

	const currentTicketPrice = current.pricePerTicket.toString();
	if (currentTicketPrice !== original.ticketPriceAmount)
		diff.ticketPriceAmount = currentTicketPrice;

	// Participation limits
	if (current.numberOfWinners !== original.numberOfWinners)
		diff.numberOfWinners = current.numberOfWinners;
	if (current.minParticipants !== original.minParticipants)
		diff.minParticipants = current.minParticipants;
	if (current.maxParticipants !== original.maxParticipants)
		diff.maxParticipants = current.maxParticipants;

	// Check-in question — empty string normalized for missing original
	const originalQuestionId = original.questionId || '';
	if (checkInQuestionId !== originalQuestionId)
		diff.questionId = checkInQuestionId;

	return diff;
}

/**
 * Diffs crypto payment configuration between saved raffle and current form state.
 * Uses JSON.stringify on sorted arrays — order is irrelevant for equality.
 */
function diffCryptoFields(
	current: EditFormData,
	originalCrypto: CryptoFormFields,
): UpdateRafflePayload {
	const diff: UpdateRafflePayload = {};

	if (current.acceptsCrypto !== originalCrypto.acceptsCrypto)
		diff.acceptsCrypto = current.acceptsCrypto;

	// Sort both sides before JSON-stringifying — array order is irrelevant for equality
	const currentChainIds = current.cryptoChainIds.toSorted();
	const originalChainIds = originalCrypto.cryptoChainIds.toSorted();
	if (JSON.stringify(currentChainIds) !== JSON.stringify(originalChainIds))
		diff.cryptoChainIds = current.cryptoChainIds;

	const currentTokenIds = current.cryptoTokens.toSorted();
	const originalTokenIds = originalCrypto.cryptoTokens.toSorted();
	if (JSON.stringify(currentTokenIds) !== JSON.stringify(originalTokenIds))
		diff.cryptoTokens = current.cryptoTokens;

	const currentPricing = current.cryptoTokenPricing.toSorted((a, b) =>
		a.tokenId.localeCompare(b.tokenId),
	);
	const originalPricing = originalCrypto.cryptoTokenPricing.toSorted((a, b) =>
		a.tokenId.localeCompare(b.tokenId),
	);
	if (JSON.stringify(currentPricing) !== JSON.stringify(originalPricing))
		diff.cryptoTokenPricing = current.cryptoTokenPricing;

	return diff;
}

/**
 * Computes the diff between original raffle data and current form data.
 * Returns only the fields that have changed for partial update.
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
	// Step 1: Diff scalar fields (text, numbers, dates, limits).
	const scalarDiff = diffScalarFields(
		original,
		current,
		categoryId,
		checkInQuestionId,
	);

	// Step 2: Diff crypto configuration (chains, tokens, pricing).
	const originalCrypto = extractCryptoFormFields(original.cryptoOptions);
	const cryptoDiff = diffCryptoFields(current, originalCrypto);

	return { ...scalarDiff, ...cryptoDiff };
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
