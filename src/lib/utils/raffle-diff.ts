import type { Raffle, UpdateRafflePayload } from '@/types/raffle';

/**
 * Form data structure for edit form
 */
interface EditFormData {
	title: string;
	description: string;
	price: number;
	category: string;
	startDate: string;
	endDate: string;
	pricePerTicket: number;
	numberOfWinners: number;
	minParticipants: number;
	maxParticipants: number;
	checkInQuestion: string;
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

	// Compare start date (convert form date string to ISO)
	const currentStartAt = new Date(current.startDate).toISOString();
	if (currentStartAt !== original.startAt) {
		diff.startAt = currentStartAt;
	}

	// Compare end date (convert form date string to ISO)
	const currentEndAt = new Date(current.endDate).toISOString();
	if (currentEndAt !== original.endAt) {
		diff.endAt = currentEndAt;
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
	const diff = computeRaffleDiff(original, current, categoryId, checkInQuestionId);
	return Object.keys(diff).length > 0;
}
