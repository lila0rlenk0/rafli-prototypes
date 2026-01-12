import { BackgroundCubeLeft } from '@/assets/background-cubes/background-cube-left';
import { BackgroundCubeRight } from '@/assets/background-cubes/background-cube-right';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/ui/navbar';
import { Spinner } from '@/components/ui/spinner';
import { getSession } from '@/lib/auth/session';
import { UserStoreProvider } from '@/providers/user-store-provider';
import { ReactNode, Suspense } from 'react';

interface ProtectedLayoutProps {
	children: ReactNode;
}

/**
 * Protected Layout Content
 *
 * Internal component that accesses runtime data (cookies via getSession).
 * Must be wrapped in Suspense to prevent blocking the entire page render.
 *
 * @param children - Child components to render
 */
async function ProtectedLayoutContent({ children }: ProtectedLayoutProps) {
	const session = await getSession();
	const permissions = session?.user?.permissions || [];

	return (
		<AuthGuard>
			<UserStoreProvider permissions={permissions}>
				<Navbar>{children}</Navbar>
			</UserStoreProvider>
		</AuthGuard>
	);
}

/**
 * Protected Layout
 *
 * Server-side layout that ensures user is authenticated before rendering protected routes.
 * Uses Suspense to prevent blocking on runtime data access (cookies, headers).
 * Provides loading state while authentication is being verified.
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
				<ProtectedLayoutContent>{children}</ProtectedLayoutContent>
			</Suspense>
			<BackgroundCubeLeft className="absolute bottom-0 left-0 z-[-1] origin-bottom-left scale-[0.76]" />
			<BackgroundCubeRight className="absolute right-0 bottom-0 z-[-1] origin-bottom-right scale-[0.76]" />
		</div>
	);
}
