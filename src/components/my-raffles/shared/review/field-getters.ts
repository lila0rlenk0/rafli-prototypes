/**
 * Pure display getters for the review-step wizard screens.
 *
 * These helpers convert raw form values into the exact strings rendered
 * inside `<ReviewRow>` children. Kept free of React — the composers pass
 * form values in, get strings out, and render them.
 *
 * Typed against `ReviewFormValues` — a structural subset shared by both
 * `RaffleFormData` (create wizard) and `EditFormData` (edit wizard). The
 * two concrete form schemas are supersets of this shape, so both callers
 * satisfy the contract without introducing a discriminated union.
 */

import { getCryptoSummary } from '@/lib/utils/crypto-form';
import { formatDateTime } from '@/lib/utils/format/date-format';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import type { Category } from '@/types/category';

/**
 * Minimal structural shape consumed by every getter. Listing each field
 * explicitly (rather than re-exporting the Zod-inferred type) keeps this
 * module decoupled from either wizard's schema and makes it trivial for
 * tests to fabricate inputs.
 */
export interface ReviewFormValues {
	description: string;
	category: string;
	price: number;
	pricePerTicket: number;
	numberOfWinners: number;
	minParticipants: number;
	maxParticipants: number;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	acceptsCrypto: boolean;
	cryptoChainIds: number[];
	cryptoTokens: string[];
}

/** Fallback rendered when a value is missing — keeps rows visually consistent. */
const EMPTY_PLACEHOLDER = '—';

/**
 * @returns Raffle description verbatim — callers pipe this through the
 *   markdown renderer, which handles empty strings on its own (displaying
 *   no placeholder preserves the original review-screen behavior).
 */
export function getDescriptionDisplay(values: ReviewFormValues): string {
	return values.description;
}

/**
 * @returns Human-readable category name resolved from the selected ID, or
 *   placeholder when no category is selected or the ID cannot be matched.
 */
export function getCategoryDisplay(
	values: ReviewFormValues,
	categories: readonly Category[],
): string {
	if (!values.category) return EMPTY_PLACEHOLDER;
	const match = categories.find(cat => cat.id === values.category);
	return match?.name || EMPTY_PLACEHOLDER;
}

/**
 * @returns Declared prize value formatted as USD currency (e.g., `$120`).
 */
export function getDeclaredValueDisplay(values: ReviewFormValues): string {
	// Zod transform coerces NaN to 0, so a zero value is a legitimate zero.
	return formatCurrency(values.price, 'USD');
}

/**
 * @returns Price per ticket formatted as USD currency (e.g., `$5`).
 */
export function getPricePerTicketDisplay(values: ReviewFormValues): string {
	return formatCurrency(values.pricePerTicket, 'USD');
}

/**
 * @returns Winners count as a plain integer string (e.g., `"3"`).
 */
export function getWinnersDisplay(values: ReviewFormValues): string {
	return String(values.numberOfWinners);
}

/**
 * @returns Participants range as `"min - max"`. Mirrors the original
 *   wizard copy: 0 sentinels are rendered verbatim, matching the raw form
 *   state the host just entered.
 */
export function getParticipantsRangeDisplay(values: ReviewFormValues): string {
	return `${values.minParticipants} - ${values.maxParticipants}`;
}

/**
 * @returns Active time period as `"start - end"` formatted via
 *   `formatDateTime`. Mirrors the original wizard behavior: always uses
 *   the dash separator and leaves the side empty when a date is missing.
 */
export function getActivePeriodDisplay(values: ReviewFormValues): string {
	const start = formatDateTime(values.startDate, values.startTime);
	const end = formatDateTime(values.endDate, values.endTime);
	return `${start} - ${end}`;
}

/**
 * @returns Payment summary string — `"Card only"` when crypto is disabled,
 *   else `"<chains> · <tokens>"` via the shared `getCryptoSummary` util.
 */
export function getPaymentSummaryDisplay(values: ReviewFormValues): string {
	return getCryptoSummary({
		acceptsCrypto: values.acceptsCrypto,
		cryptoChainIds: values.cryptoChainIds,
		cryptoTokens: values.cryptoTokens,
	});
}

/**
 * @returns Total promo-code count across pending batches as a plain string,
 *   or `"0"` when no batches are queued.
 */
export function getPromoCodesCountDisplay(
	pendingBatches: readonly { count: number }[],
): string {
	const total = pendingBatches.reduce((sum, batch) => sum + batch.count, 0);
	return String(total);
}

/**
 * Detects whether the configured start datetime has already elapsed,
 * which drives the "starts immediately" banner in both wizards.
 *
 * Avoids `new Date(\`${startDate}T${startTime}\`)` which parses as UTC in
 * some browsers — builds the Date via component parts so the comparison
 * always runs in the user's local time zone (matching the backend's
 * schedule logic).
 *
 * @returns `true` when the start datetime is now or in the past.
 */
export function willStartImmediately(values: ReviewFormValues): boolean {
	if (!values.startDate) return false;
	const [year, month, day] = values.startDate.split('-').map(Number);
	const [hours, minutes] = (values.startTime || '00:00').split(':').map(Number);
	const start = new Date(year, month - 1, day, hours, minutes);
	if (Number.isNaN(start.getTime())) return false;
	return start <= new Date();
}
