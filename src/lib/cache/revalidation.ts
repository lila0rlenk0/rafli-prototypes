import { revalidatePath, revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/lib/api/constants';

/**
 * Revalidates the user's raffles cache.
 * Should be called after operations that modify the raffle list (create, update, delete).
 * @returns void
 */
export function revalidateMyRaffles(): void {
	revalidateTag(CACHE_TAGS.MY_RAFFLES, 'max');
	// 'page' — invalidate the route page segment; pairs with revalidateTag for cacheComponents
	revalidatePath('/my-raffles', 'page');
}

/**
 * Revalidates the cache of a specific raffle's details
 * Should be called after operations that modify a specific raffle (update, upload)
 *
 * @param raffleId - ID of the raffle to be revalidated
 * @returns void
 */
export function revalidateRaffleDetail(raffleId: string): void {
	revalidateTag(`${CACHE_TAGS.RAFFLE_DETAIL}-${raffleId}`, 'max');
}

/**
 * Revalidates winner/host fulfillment surfaces after winning status mutations.
 * We always refresh /my-raffles and, when slug is known, both browse detail pages.
 *
 * @param publicSlug - Optional public slug of the raffle for targeted path revalidation
 * @returns void
 */
export function revalidateWinningPaths(publicSlug?: string): void {
	revalidatePath('/my-raffles', 'page');

	if (!publicSlug) return;

	revalidatePath(`/browse/${publicSlug}`, 'page');
	revalidatePath(`/browse/${publicSlug}/fulfillment`, 'page');
}
