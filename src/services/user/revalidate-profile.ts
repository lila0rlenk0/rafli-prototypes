'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidates the user profile page cache.
 * Server action callable from client components after profile mutations.
 *
 * Revalidation target: /profile path (forces fresh data fetch on next navigation)
 *
 * @returns Promise that resolves when revalidation is scheduled
 */
export async function revalidateProfile(): Promise<void> {
	revalidatePath('/profile', 'page');
}
