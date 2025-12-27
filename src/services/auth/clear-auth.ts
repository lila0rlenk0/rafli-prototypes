'use server';

import { AUTH_COOKIES } from '@/lib/auth/config';
import { cookies } from 'next/headers';

export async function clearAuthCookies() {
	const cookieStore = await cookies();
	cookieStore.delete(AUTH_COOKIES.TOKEN);
	cookieStore.delete(AUTH_COOKIES.SESSION);
}
