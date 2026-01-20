import {
	raffleSortOptionSchema,
	raffleStatusSchema,
	type RaffleSortOption,
} from '@/types/raffle';

/**
 * Parses raffle status from URL search param
 * Supports single status or comma-separated statuses (e.g., "draft,queued")
 *
 * TODO: Remove comma-separated workaround after BE supports it natively.
 * Once BE is fixed, revert to: `raffleStatusSchema.safeParse(value)`
 *
 * @param value - Status string from URL (single or comma-separated)
 * @returns Validated status string or undefined if invalid
 */
export function parseRaffleStatus(value?: string): string | undefined {
	if (!value) return undefined;

	// Handle comma-separated statuses (workaround for BE limitation)
	if (value.includes(',')) {
		const statuses = value.split(',').map(s => s.trim());
		const allValid = statuses.every(
			s => raffleStatusSchema.safeParse(s).success,
		);
		return allValid ? value : undefined;
	}

	// Single status validation
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
