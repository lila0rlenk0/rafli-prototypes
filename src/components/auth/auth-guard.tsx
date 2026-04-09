import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

import { getSession } from '@/lib/auth/session';

interface AuthGuardProps {
	children: ReactNode;
}

/**
 * Server component that gates routes behind authentication.
 * Redirects to sign-in if no valid session exists.
 *
 * @returns Children when authenticated
 */
export async function AuthGuard({ children }: AuthGuardProps) {
	const session = await getSession();

	if (!session) {
		redirect('/sign-in');
	}

	// Fragment wrapper removed — single child passes through directly
	return children;
}
