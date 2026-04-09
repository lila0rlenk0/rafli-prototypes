import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

import { getCurrentUser } from '@/lib/auth/session';

interface AuthGuardProps {
	children: ReactNode;
}

/**
 * Server component — gates routes behind auth, redirects to /sign-in if no session.
 * Uses getCurrentUser (React.cache-wrapped) to avoid redundant JWT decoding
 * when multiple layout segments check auth in the same request.
 * @returns Children if authenticated, redirects otherwise
 */
export async function AuthGuard({ children }: AuthGuardProps) {
	const session = await getCurrentUser();

	if (!session) {
		redirect('/sign-in');
	}

	// Fragment wrapper removed — single child passes through directly
	return children;
}
