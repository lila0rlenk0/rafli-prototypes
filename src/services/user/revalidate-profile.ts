'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidates the user profile cache
 * Server action that can be called from client components
 * Invalidates the /profile path to force fresh data fetch
 *
 * @returns Promise that resolves when revalidation is scheduled
 */
export async function revalidateProfile(): Promise<void> {
	revalidatePath('/profile');
}
