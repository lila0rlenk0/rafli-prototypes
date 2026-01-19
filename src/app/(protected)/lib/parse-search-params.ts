import {
	raffleSortOptionSchema,
	raffleStatusSchema,
	type RaffleSortOption,
	type RaffleStatus,
} from '@/types/raffle';

/**
 * Parses raffle status from URL search param
 */
export function parseRaffleStatus(value?: string): RaffleStatus | undefined {
	const result = raffleStatusSchema.safeParse(value);
	return result.success ? result.data : undefined;
}

/**
 * Parses raffle sort option from URL search param
 */
export function parseRaffleSortOption(
	value?: string,
): RaffleSortOption | undefined {
	const result = raffleSortOptionSchema.safeParse(value);
	return result.success ? result.data : undefined;
}

/**
 * Parses page number from URL search param
 */
export function parsePage(value?: string): number {
	const parsed = value ? parseInt(value, 10) : 1;
	return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}
