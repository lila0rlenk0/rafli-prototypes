import { revalidatePath, revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/lib/api/config';

/**
 * Revalidates the user's raffles cache
 * Should be called after operations that modify the raffle list (create, update, delete)
 */
export function revalidateMyRaffles() {
	revalidateTag(CACHE_TAGS.MY_RAFFLES, 'max');
	revalidatePath('/my-raffles');
}

/**
 * Revalidates the cache of a specific raffle's details
 * Should be called after operations that modify a specific raffle (update, upload)
 *
 * @param raffleId - ID of the raffle to be revalidated
 */
export function revalidateRaffleDetail(raffleId: string) {
	revalidateTag(`${CACHE_TAGS.RAFFLE_DETAIL}-${raffleId}`, 'max');
}
