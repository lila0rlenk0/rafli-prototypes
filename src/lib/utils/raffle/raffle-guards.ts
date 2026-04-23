import type { EnrolledRaffle, MyRaffleItem } from '@/types/raffle';

/**
 * Type guard: enrolled "My raffles" rows carry `myTicketCount`; browse/public
 * rows do not. Used for card CTAs and ticket affordances.
 */
export function isEnrolledRaffle(
	raffle: MyRaffleItem,
): raffle is EnrolledRaffle {
	return 'myTicketCount' in raffle;
}
