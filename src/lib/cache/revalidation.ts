import { revalidatePath, revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/lib/api/config';

/**
 * Revalidates the user's raffles cache.
 * Should be called after operations that modify the raffle list (create, update, delete).
 * @returns void
 */
export function revalidateMyRaffles(): void {
	revalidateTag(CACHE_TAGS.MY_RAFFLES, 'max');
	revalidatePath('/my-raffles');
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
	revalidatePath('/my-raffles');

	if (!publicSlug) return;

	revalidatePath(`/browse/${publicSlug}`);
	revalidatePath(`/browse/${publicSlug}/fulfillment`);
}
