import { Suspense, type ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/guard';
import { Navbar } from '@/components/ui/navbar';
import { ScreenLoader } from '@/components/ui-custom/screen-loader';
import { getCurrentUser } from '@/lib/auth/session';
import { parsePermissions } from '@/lib/permissions';
import { RealtimeProviders } from '@/providers/realtime-providers';
import { UserStoreProvider } from '@/providers/user-store-provider';

interface ProtectedLayoutProps {
	children: ReactNode;
}

/**
 * Protected Layout Content
 *
 * Internal component that accesses runtime data (cookies via getCurrentUser).
 * Uses the same React.cache-bounded `getCurrentUser` as `AuthGuard` so this
 * layout and the guard do not run two separate `/me` round-trips in one
 * request. Must be wrapped in Suspense to prevent blocking the entire page render.
 *
 * @param children - Child components to render
 */
async function ProtectedLayoutContent({ children }: ProtectedLayoutProps) {
	const user = await getCurrentUser();
	const permissions = parsePermissions(user?.permissions);

	return (
		<AuthGuard>
			<UserStoreProvider permissions={permissions}>
				{/*
				 * Notification + chat WS providers live here so the navbar can
				 * render a real-time unread badge on every protected page
				 * without each route re-establishing the WebSocket.
				 */}
				<RealtimeProviders>
					<Navbar>{children}</Navbar>
				</RealtimeProviders>
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
		<div className="relative min-h-dvh">
			<Suspense fallback={<ScreenLoader />}>
				<ProtectedLayoutContent>{children}</ProtectedLayoutContent>
			</Suspense>
		</div>
	);
}
