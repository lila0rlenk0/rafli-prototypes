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
 * Revalidates the user's subscription-aware surfaces after a subscribe /
 * cancel / change-plan mutation.
 *
 * Path-based — there's no subscription cache tag today (only `MY_RAFFLES`
 * and `RAFFLE_DETAIL` carry tags per `data-fetching.md`), and both routes
 * call `getMySubscription()` directly in their server components. Refreshing
 * both keeps the credits-section "My Sub" cell, the mint upsell banner, and
 * the cancel-card visibility on `/pricing` in lock-step with the mutation.
 *
 * @returns void
 */
export function revalidateMySubscription(): void {
	revalidatePath('/pricing', 'page');
	revalidatePath('/profile', 'page');
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
