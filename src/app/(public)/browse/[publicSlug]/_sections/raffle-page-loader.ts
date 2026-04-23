import 'server-only';

import { getCategories } from '@/services/raffle/get-categories';
import { getRaffle } from '@/services/raffle/get-raffle';
import type { Category } from '@/types/category';
import type { Raffle } from '@/types/raffle';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';

/**
 * Public shell for the raffle detail route: everything needed for first paint
 * before session-scoped work (tickets, winnings, KYC) in Suspense children.
 */
export interface RaffleDetailPublic {
	raffle: Raffle;
	categories: readonly Category[];
}

export type LoadRafflePageResult =
	| { status: 'ok'; data: RaffleDetailPublic }
	| { status: 'not-found' }
	| { status: 'error'; error: RaffleErrorCode };

export async function loadRafflePage(
	publicSlug: string,
): Promise<LoadRafflePageResult> {
	const [raffleResponse, categoriesResponse] = await Promise.all([
		getRaffle(publicSlug),
		getCategories(),
	]);

	if (!raffleResponse.success) {
		if (raffleResponse.error === RAFFLE_ERROR_CODES.NOT_FOUND) {
			return { status: 'not-found' };
		}
		return { status: 'error', error: raffleResponse.error };
	}

	// Categories failure is non-fatal: UI falls back via resolveCategoryName.
	const categories = categoriesResponse.success
		? categoriesResponse.data.categories.filter(c => c.isActive)
		: [];

	return {
		status: 'ok',
		data: { raffle: raffleResponse.data, categories },
	};
}
