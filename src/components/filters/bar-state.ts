import { RAFFLE_SORT_OPTION } from '@/types/raffle';

const ALLOWED_SORT_OPTIONS = new Set<string>([
	RAFFLE_SORT_OPTION.NEWEST,
	RAFFLE_SORT_OPTION.ENDING_SOON,
	RAFFLE_SORT_OPTION.LOWEST_PRICE,
]);

/**
 * Normalizes the incoming sort query param to a supported enum value.
 * Invalid values fall back to NEWEST so the Select stays controlled.
 */
export function normalizeSortOption(sortParam: string | null): string {
	if (!sortParam || !ALLOWED_SORT_OPTIONS.has(sortParam)) {
		return RAFFLE_SORT_OPTION.NEWEST;
	}
	return sortParam;
}
