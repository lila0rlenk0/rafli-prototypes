/**
 * Pure helpers for `TicketPurchaseCard`. Extracted so the derived-state hook
 * stays under the 60-line cap AND the math is unit-testable without a React
 * render cycle.
 */

/**
 * Parses the user's available credits (decimal string) into a number used
 * for the credits-CTA visibility gate. A malformed or missing value resolves
 * to zero so the CTA stays hidden — we never want to surface a credits
 * button whose displayed balance we can't trust.
 *
 * @param availableCredits - Credits balance as a decimal string, or nullish
 * @returns Numeric balance, clamped to >= 0, with NaN coerced to 0
 */
export function parseAvailableCredits(
	availableCredits: string | null | undefined,
): number {
	if (!availableCredits) return 0;
	const parsed = parseFloat(availableCredits);
	if (Number.isNaN(parsed)) return 0;
	return Math.max(0, parsed);
}

/**
 * Builds the near-CTA closing-soon warning copy. Rendered above the price
 * so the user sees the cutoff risk at decision time, not buried in the
 * countdown. Crypto flows get an extra confirmation-lag sentence because
 * on-chain settlement is the realistic failure mode near the end.
 *
 * @param hasSelectableCryptoPaymentOption - True when the crypto CTA is visible
 * @returns Warning copy ready for the amber banner
 */
export function getClosingSoonWarning(options: {
	hasSelectableCryptoPaymentOption: boolean;
}): string {
	const { hasSelectableCryptoPaymentOption } = options;
	const baseMessage =
		'Sweepstakes closes soon. Purchases stay open until the countdown ends. Start checkout now to avoid missing the cutoff.';

	if (!hasSelectableCryptoPaymentOption) return baseMessage;

	return `${baseMessage} Crypto payments can take longer to confirm near the end.`;
}

/**
 * Pluralizes the bonus-entry count label for free-ticket promos. Small
 * helper extracted so the JSX stays under the 3-level nesting cap.
 *
 * @param count - Number of bonus entries granted by the promo
 * @returns Full "N bonus entry/entries with this code" copy
 */
export function formatBonusEntriesLabel(count: number): string {
	const noun = count === 1 ? 'entry' : 'entries';
	return `${count} bonus ${noun} with this code`;
}
