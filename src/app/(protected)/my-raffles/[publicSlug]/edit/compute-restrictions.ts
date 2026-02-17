import { RAFFLE_STATUS } from '@/types/raffle';
import type { Raffle } from '@/types/raffle';

import type { FieldRestrictions } from './schema';

/**
 * Computes field restrictions based on raffle state
 * - startDateLocked: if raffle is already live or has participants
 * - priceLocked: if any tickets have been sold
 *
 * @param raffle - The raffle to check
 * @returns FieldRestrictions object
 */
export function computeRestrictions(raffle: Raffle): FieldRestrictions {
	return {
		startDateLocked:
			raffle.status === RAFFLE_STATUS.LIVE || raffle.participantsCount > 0,
		priceLocked: raffle.participantsCount > 0,
	};
}
