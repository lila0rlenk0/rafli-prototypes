import { Suspense, type ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/ui/navbar';
import { ScreenLoader } from '@/components/ui/screen-loader';
import { getSession } from '@/lib/auth/session';
import { parsePermissions } from '@/lib/permissions';
import { NotificationStoreProvider } from '@/providers/notification-store-provider';
import { UserStoreProvider } from '@/providers/user-store-provider';

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
	const permissions = parsePermissions(session?.user?.permissions);

	return (
		<AuthGuard>
			<UserStoreProvider permissions={permissions}>
				<NotificationStoreProvider>
					<Navbar>{children}</Navbar>
				</NotificationStoreProvider>
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
			<Suspense fallback={<ScreenLoader />}>
				<ProtectedLayoutContent>{children}</ProtectedLayoutContent>
			</Suspense>
		</div>
	);
}
