'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidates the user profile cache
 * Server action that can be called from client components
 * Invalidates the /profile path to force fresh data fetch
 */
export async function revalidateProfile() {
	revalidatePath('/profile');
}
