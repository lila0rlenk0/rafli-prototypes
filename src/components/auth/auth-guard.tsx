import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface AuthGuardProps {
	children: ReactNode;
}

export async function AuthGuard({ children }: AuthGuardProps) {
	const session = await getSession();

	if (!session) {
		redirect('/sign-in');
	}

	return <>{children}</>;
}
