import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { AdminNavbar } from '@/components/admin/admin-navbar';
import { ScreenLoader } from '@/components/ui/screen-loader';
import { getSession } from '@/lib/auth/session';
import { parsePermissions, PERMISSIONS } from '@/lib/permissions';
import { UserStoreProvider } from '@/providers/user-store-provider';

interface AdminLayoutProps {
	children: ReactNode;
}

/**
 * Admin Layout Content
 *
 * Async server component that reads runtime data (session cookies).
 * Checks for admin:kyc:review permission — renders 404 for unauthorized users.
 * Must be wrapped in Suspense to prevent blocking the page render.
 *
 * @param children - Child components (admin pages)
 */
async function AdminLayoutContent({ children }: AdminLayoutProps) {
	const session = await getSession();
	const permissions = parsePermissions(session?.user?.permissions);

	// Render the global 404 page when the user lacks admin:kyc:review permission.
	// Using notFound() instead of redirect() so unauthorized users see
	// the same response as a non-existent route — no information leakage
	// about admin routes existing.
	if (!permissions.includes(PERMISSIONS.KYC_REVIEW)) {
		notFound();
	}

	// AuthGuard omitted — the permission check above already covers
	// unauthenticated users (no session = no permissions = notFound)
	return (
		<UserStoreProvider permissions={permissions}>
			<AdminNavbar>{children}</AdminNavbar>
		</UserStoreProvider>
	);
}

/**
 * Admin Layout
 *
 * Root layout for the (admin) route group. Provides permission-gated
 * access, admin-specific navigation, and user store context.
 * Follows the same Suspense pattern as (protected)/layout.tsx.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
	return (
		<div className="relative min-h-screen">
			<Suspense fallback={<ScreenLoader />}>
				<AdminLayoutContent>{children}</AdminLayoutContent>
			</Suspense>
		</div>
	);
}
