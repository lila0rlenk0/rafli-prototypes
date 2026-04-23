import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

import { getCurrentUser } from '@/lib/auth/session';

interface AuthGuardProps {
	children: ReactNode;
}

/**
 * Server component — gates routes behind auth, redirects to /sign-in if no user.
 * Uses getCurrentUser (React.cache + shared `getSession`) so nested checks in the
 * same request dedupe — pair with the protected layout, which also calls
 * getCurrentUser for permissions (same cached user; not two `/me` round-trips).
 * @returns Children if authenticated, redirects otherwise
 */
export async function AuthGuard({ children }: AuthGuardProps) {
	const user = await getCurrentUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Fragment wrapper removed — single child passes through directly
	return children;
}
