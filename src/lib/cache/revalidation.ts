import { revalidatePath, revalidateTag } from 'next/cache';

import { CACHE_TAGS, raffleDetailTag } from '@/lib/api/constants';

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
 * Revalidates the cache of a specific raffle's details.
 *
 * The cached entry in `getRaffle` is tagged with both the id AND the slug; pass
 * `publicSlug` when in scope so both tags clear together. Id-only callers (e.g.
 * `verify-x-share`) still work — the cached entry carries the id-tag too.
 *
 * @param raffleId - ID of the raffle to be revalidated
 * @param publicSlug - Optional public slug of the raffle, when known by the caller
 * @returns void
 */
export function revalidateRaffleDetail(
	raffleId: string,
	publicSlug?: string,
): void {
	revalidateTag(raffleDetailTag(raffleId), 'max');
	if (publicSlug) revalidateTag(raffleDetailTag(publicSlug), 'max');
}

/**
 * Revalidates the user's subscription-aware surfaces after a subscribe /
 * cancel mutation.
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
