import { BackgroundCubeLeft } from '@/assets/background-cubes/background-cube-left';
import { BackgroundCubeRight } from '@/assets/background-cubes/background-cube-right';
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

	return (
		<div className="relative min-h-screen">
			<Navbar>{children}</Navbar>
			<BackgroundCubeLeft className="absolute bottom-0 left-0 z-[-1] origin-bottom-left scale-[0.76]" />
			<BackgroundCubeRight className="absolute right-0 bottom-0 z-[-1] origin-bottom-right scale-[0.76]" />
		</div>
	);
}
