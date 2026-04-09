'use server';

import { cookies } from 'next/headers';

import { AUTH_COOKIES, MODE_COOKIE_OPTIONS } from '@/lib/auth/config';
import { USER_MODE, userModeSchema, type UserMode } from '@/types/user-mode';

/**
 * Gets user mode from cookie.
 * @returns UserMode or default PARTICIPANT if not set/invalid
 */
export async function getUserModeCookie(): Promise<UserMode> {
	const cookieStore = await cookies();
	const value = cookieStore.get(AUTH_COOKIES.USER_MODE)?.value;

	if (!value) return USER_MODE.PARTICIPANT;

	const parsed = userModeSchema.safeParse(value);
	return parsed.success ? parsed.data : USER_MODE.PARTICIPANT;
}

/**
 * Sets user mode cookie (called from client via server action).
 * @param mode - UserMode to set
 * @returns Promise that resolves when cookie is set
 */
export async function setUserModeCookie(mode: UserMode): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set(AUTH_COOKIES.USER_MODE, mode, MODE_COOKIE_OPTIONS);
}

/**
 * Clears user mode cookie (called on sign out).
 * @returns Promise that resolves when cookie is deleted
 */
export async function clearUserModeCookie(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(AUTH_COOKIES.USER_MODE);
}
