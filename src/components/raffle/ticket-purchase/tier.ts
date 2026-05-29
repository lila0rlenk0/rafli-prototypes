/**
 * Confirmation tier — derived from the entry count just purchased.
 * Drives the celebration modal's color, copy, density, and card size
 * so a larger entry purchase reads as a richer moment.
 */
export type ConfirmationTier = 'TIER1' | 'TIER2' | 'TIER3';

const TIER2_FLOOR = 10;
const TIER3_FLOOR = 30;

/**
 * Pick the celebration tier from the purchase quantity. Thresholds
 * mirror the Figma `.tmp-animations` bundle: 1-9 → TIER1, 10-29 →
 * TIER2, 30+ → TIER3.
 *
 * @param ticketQuantity - Entries purchased in the just-settled order
 * @returns Tier key the celebration modal renders against
 */
export function resolveConfirmationTier(
	ticketQuantity: number,
): ConfirmationTier {
	if (ticketQuantity >= TIER3_FLOOR) return 'TIER3';
	if (ticketQuantity >= TIER2_FLOOR) return 'TIER2';
	return 'TIER1';
}
