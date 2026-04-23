import type {
	Raffle,
	TokenPricingEntry,
	UpdateRafflePayload,
} from '@/types/raffle';

import {
	extractCryptoFormFields,
	type CryptoFormFields,
} from '@/lib/utils/crypto-form';

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
 * Raffle-diff input — original record + current form state + resolved
 * category/question IDs. Bundled into one arg so the three diff entry
 * points stay within the 3-param cap (code-style.md).
 */
export interface RaffleDiffInput {
	original: Raffle;
	current: EditFormData;
	categoryId: string;
	checkInQuestionId: string;
}

/** Column-wise diff pair — current value + previous value on the same key. */
type FieldPair<P, K extends keyof P> = {
	key: K;
	current: P[K];
	previous: P[K] | null | undefined;
};

/**
 * Applies every `(key, current, previous)` triple that differs onto the
 * target diff object. The generic is load-bearing: without it, TS widens
 * `diff[pair.key]` to the intersection of all value types and rejects the
 * assignment. A single-pass loop replaces the per-field `if` chain,
 * collapsing cyclomatic complexity in the caller while keeping the diff
 * ergonomics (add a field → add one entry to the array).
 */
function applyFieldDiff<P extends UpdateRafflePayload>(
	diff: P,
	pairs: ReadonlyArray<FieldPair<P, keyof P>>,
): void {
	for (const pair of pairs) {
		if (pair.current !== pair.previous) {
			diff[pair.key] = pair.current;
		}
	}
}

/**
 * Diffs scalar raffle fields (title, description, price, category, dates, limits, question).
 * Extracted from computeRaffleDiff to stay under the 30-SLOC function limit.
 */
function diffScalarFields(input: RaffleDiffInput): UpdateRafflePayload {
	const { original, current, categoryId, checkInQuestionId } = input;
	const diff: UpdateRafflePayload = {};

	// Date/time — form stores separately, combine into ISO for comparison
	const currentStartISO = new Date(
		`${current.startDate}T${current.startTime || '00:00'}`,
	).toISOString();
	const currentEndISO = new Date(
		`${current.endDate}T${current.endTime || '00:00'}`,
	).toISOString();

	applyFieldDiff(diff, [
		{ key: 'title', current: current.title, previous: original.title },
		{
			key: 'description',
			current: current.description,
			previous: original.description,
		},
		// Numeric fields stored as strings — coerce form number to string
		{
			key: 'declaredValueAmount',
			current: current.price.toString(),
			previous: original.declaredValueAmount,
		},
		{
			key: 'categoryId',
			current: categoryId,
			previous: original.categoryId,
		},
		{ key: 'startAt', current: currentStartISO, previous: original.startAt },
		{ key: 'endAt', current: currentEndISO, previous: original.endAt },
		{
			key: 'ticketPriceAmount',
			current: current.pricePerTicket.toString(),
			previous: original.ticketPriceAmount,
		},
		{
			key: 'numberOfWinners',
			current: current.numberOfWinners,
			previous: original.numberOfWinners,
		},
		{
			key: 'minParticipants',
			current: current.minParticipants,
			previous: original.minParticipants,
		},
		{
			key: 'maxParticipants',
			current: current.maxParticipants,
			previous: original.maxParticipants,
		},
		// Check-in question — empty string normalized for missing original
		{
			key: 'questionId',
			current: checkInQuestionId,
			previous: original.questionId || '',
		},
	]);

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
 * @param input - Original raffle + form state + resolved IDs
 * @returns UpdateRafflePayload with only changed fields
 */
export function computeRaffleDiff(input: RaffleDiffInput): UpdateRafflePayload {
	// Step 1: Diff scalar fields (text, numbers, dates, limits).
	const scalarDiff = diffScalarFields(input);

	// Step 2: Diff crypto configuration (chains, tokens, pricing).
	const originalCrypto = extractCryptoFormFields(input.original.cryptoOptions);
	const cryptoDiff = diffCryptoFields(input.current, originalCrypto);

	return { ...scalarDiff, ...cryptoDiff };
}

/**
 * Checks if there are any changes between the original raffle and current form data
 *
 * @param input - Original raffle + form state + resolved IDs
 * @returns true if there are changes, false otherwise
 */
export function hasRaffleChanges(input: RaffleDiffInput): boolean {
	const diff = computeRaffleDiff(input);
	return Object.keys(diff).length > 0;
}
