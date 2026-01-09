import { BackgroundCubeLeft } from '@/assets/background-cubes/background-cube-left';
import { BackgroundCubeRight } from '@/assets/background-cubes/background-cube-right';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/ui/navbar';
import { Spinner } from '@/components/ui/spinner';
import { ReactNode, Suspense } from 'react';

interface ProtectedLayoutProps {
	children: ReactNode;
}

/**
 * Protected Layout
 *
 * Server-side layout that ensures user is authenticated before rendering protected routes.
 * Uses JWT validation to verify authentication and redirects to sign-in if not authenticated.
 */
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
	return (
		<div className="relative min-h-screen">
			<Suspense
				fallback={
					<div className="flex h-screen w-full items-center justify-center">
						<Spinner />
					</div>
				}
			>
				<AuthGuard>
					<Navbar>{children}</Navbar>
				</AuthGuard>
			</Suspense>
			<BackgroundCubeLeft className="absolute bottom-0 left-0 z-[-1] origin-bottom-left scale-[0.76]" />
			<BackgroundCubeRight className="absolute right-0 bottom-0 z-[-1] origin-bottom-right scale-[0.76]" />
		</div>
	);
}
