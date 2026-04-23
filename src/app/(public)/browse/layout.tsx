import { Suspense, type ReactNode, type ComponentProps } from 'react';

import { ScreenLoader } from '@/components/ui-custom/screen-loader';
import { getSession } from '@/lib/auth/session';
import { parsePermissions } from '@/lib/permissions';
import { RealtimeProviders } from '@/providers/realtime-providers';
import { UserStoreProvider } from '@/providers/user-store-provider';

interface PublicBrowseLayoutProps {
	children: ReactNode;
}

/**
 * Public Browse Layout Content
 *
 * Internal async component that accesses runtime data (cookies via getSession).
 * Extracted from the layout so it can be wrapped in Suspense — getSession reads
 * cookies which blocks streaming if called directly in a layout.
 *
 * Data flow: reads session cookie → derives permissions → conditionally wraps
 * children with the auth-aware provider tree. The navbar intentionally lives
 * at the page level (not here) so each surface can populate the PublicNavbar
 * `topBanner` slot with its own marquee copy — listing, active raffle detail,
 * and subroutes like /ticket-ids all need different banners or none at all,
 * and a shared layout-level navbar would force one banner decision on all of
 * them (the previous architecture that leaked the share-to-earn banner into
 * /ticket-ids and concluded raffles).
 *
 * @param children - Child page/layout components from the browse segment
 */
async function PublicBrowseLayoutContent({
	children,
}: PublicBrowseLayoutProps) {
	// Step 1: Read session from httpOnly cookie — single await, no caching needed.
	const session = await getSession();
	const isAuthenticated = !!session;

	// Step 2: Parse permission bitmask for UserStoreProvider.
	// Empty array for guests — providers are skipped entirely below.
	const permissions = isAuthenticated
		? parsePermissions(session?.user?.permissions)
		: [];

	// Step 3: Wrap with auth stores only for authenticated users. Guests skip
	// providers — hooks like useUserStore guard against missing context. Pages
	// render their own PublicNavbar inside this tree.
	if (isAuthenticated) {
		return (
			<UserStoreProvider permissions={permissions}>
				<RealtimeProviders>{children}</RealtimeProviders>
			</UserStoreProvider>
		);
	}

	return <>{children}</>;
}

/**
 * Public Browse Layout
 *
 * Server Component layout for all /browse/* pages.
 * Suspense wraps the content component because it calls getSession (reads cookies),
 * which would block streaming if invoked at the layout level directly.
 * Fallback shows a full-screen loader until session resolution completes.
 */
export default function PublicBrowseLayout({
	children,
}: PublicBrowseLayoutProps) {
	return (
		<main className="relative min-h-dvh">
			{/* Decorative background — fixed position, non-interactive */}
			<ColoredShapes className="scale-xs pointer-events-none fixed top-0 left-0 z-(--z-sticky) origin-top-left" />
			{/* Suspense boundary: covers cookie-dependent auth resolution in content component */}
			<Suspense fallback={<ScreenLoader />}>
				<PublicBrowseLayoutContent>{children}</PublicBrowseLayoutContent>
			</Suspense>
		</main>
	);
}

/**
 * ColoredShapes Background Component
 *
 * Decorative SVG shapes for the browse page background.
 */
function ColoredShapes(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="851"
			height="559"
			viewBox="0 0 851 559"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M-243.831 -72.0817C-240.401 -84.8849 -227.241 -92.4829 -214.437 -89.0523L259.373 37.9049C272.176 41.3355 279.774 54.4956 276.344 67.2988L149.387 541.109C145.956 553.913 132.796 561.511 119.993 558.08L-353.818 431.123C-366.621 427.692 -374.219 414.532 -370.788 401.729L-243.831 -72.0817Z"
				fill="#C4EDFF"
			/>
			<path
				d="M29.0231 -362.816C34.7295 -374.779 49.0539 -379.852 61.0174 -374.145L624.656 -105.298C636.62 -99.5917 641.692 -85.2673 635.986 -73.3037L367.139 490.335C361.432 502.299 347.108 507.371 335.144 501.665L-228.495 232.817C-240.458 227.111 -245.531 212.787 -239.824 200.823L29.0231 -362.816Z"
				fill="#BEFFDB"
			/>
			<path
				d="M135.361 -172.953C128.734 -184.432 132.667 -199.11 144.146 -205.738L568.953 -451C580.432 -457.627 595.11 -453.694 601.738 -442.215L847 -17.4084C853.627 -5.92936 849.694 8.74883 838.215 15.3762L413.408 260.639C401.929 267.266 387.251 263.333 380.624 251.854L135.361 -172.953Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
