import { Suspense, type ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/ui/navbar';
import { ScreenLoader } from '@/components/ui/screen-loader';
import { getSession } from '@/lib/auth/session';
import { NotificationStoreProvider } from '@/providers/notification-store-provider';
import { UserStoreProvider } from '@/providers/user-store-provider';
import { permissionSchema, type Permission } from '@/types/user-mode';

interface ProtectedLayoutProps {
	children: ReactNode;
}

/**
 * Validates and filters permissions from session
 * Only includes valid Permission values, discards unknown permissions
 */
function parsePermissions(rawPermissions: string[] | undefined): Permission[] {
	if (!rawPermissions) return [];
	return rawPermissions.filter(
		(p): p is Permission => permissionSchema.safeParse(p).success,
	);
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
			{/*<BackgroundCubeLeft className="absolute bottom-0 left-0 z-[-1] origin-bottom-left scale-[0.76]" />
			<BackgroundCubeRight className="absolute right-0 bottom-0 z-[-1] origin-bottom-right scale-[0.76]" />*/}
		</div>
	);
}
