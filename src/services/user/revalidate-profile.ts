'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidates the user profile page cache.
 *
 * Imported by `update-me` and `upload-avatar` (both schedule this via
 * `runAfter` so the purge doesn't block the mutation response).
 *
 * Revalidation target: /profile path (forces fresh data fetch on next navigation).
 *
 * @returns Promise that resolves when revalidation is scheduled
 */
export async function revalidateProfile(): Promise<void> {
	revalidatePath('/profile', 'page');
}
