import { Navbar } from '@/components/ui/navbar';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface ProtectedLayoutProps {
	children: ReactNode;
}

export default async function ProtectedLayout({
	children,
}: ProtectedLayoutProps) {
	const session = await getSession();
	if (!session) {
		redirect('/sign-in');
	}

	return <Navbar>{children}</Navbar>;
}
