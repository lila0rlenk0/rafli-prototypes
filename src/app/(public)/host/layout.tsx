import { Suspense, type ReactNode, type ComponentProps } from 'react';

import { PublicNavbar } from '@/components/ui/public-navbar';
import { ScreenLoader } from '@/components/ui/screen-loader';
import { getSession } from '@/lib/auth/session';
import { UserStoreProvider } from '@/providers/user-store-provider';
import { permissionSchema, type Permission } from '@/types/user-mode';

interface PublicHostLayoutProps {
	children: ReactNode;
}

/**
 * Validates and filters permissions from session
 * Only includes valid Permission values, discards unknown permissions
 * @param rawPermissions - Raw permission strings from session
 * @returns Array of valid Permission values
 */
function parsePermissions(rawPermissions: string[] | undefined): Permission[] {
	if (!rawPermissions) return [];
	return rawPermissions.filter(
		(p): p is Permission => permissionSchema.safeParse(p).success,
	);
}

/**
 * Public Host Layout Content
 *
 * Internal component that accesses runtime data (cookies via getSession).
 * Must be wrapped in Suspense to prevent blocking the entire page render.
 * Provides auth-aware navigation for both authenticated and non-authenticated users.
 *
 * @param children - Child components to render
 */
async function PublicHostLayoutContent({ children }: PublicHostLayoutProps) {
	const session = await getSession();
	const isAuthenticated = !!session;
	const permissions = isAuthenticated
		? parsePermissions(session?.user?.permissions)
		: [];

	const content = (
		<PublicNavbar isAuthenticated={isAuthenticated}>{children}</PublicNavbar>
	);

	// Only wrap with UserStoreProvider for authenticated users
	if (isAuthenticated) {
		return (
			<UserStoreProvider permissions={permissions}>{content}</UserStoreProvider>
		);
	}

	return content;
}

/**
 * Public Host Layout
 *
 * Server-side layout for public host profile pages.
 * Uses Suspense to prevent blocking on runtime data access (cookies, headers).
 * Supports both authenticated and non-authenticated users.
 */
export default function PublicHostLayout({ children }: PublicHostLayoutProps) {
	return (
		<main className="relative min-h-screen">
			<Suspense fallback={<ScreenLoader />}>
				<PublicHostLayoutContent>{children}</PublicHostLayoutContent>
			</Suspense>
			<LeftColoredShapes className="fixed bottom-0 left-0 -z-1 origin-bottom-left scale-[.65]" />
			<RightColoredShapes className="fixed right-0 bottom-0 -z-1 origin-bottom-right scale-[.65]" />
		</main>
	);
}

function LeftColoredShapes(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="625"
			height="458"
			viewBox="0 0 625 458"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M300.95 611.487C288.147 614.918 274.987 607.32 271.556 594.517L189.599 288.649C186.168 275.846 193.766 262.685 206.57 259.255L512.438 177.298C525.241 173.867 538.401 181.465 541.831 194.268L623.789 500.136C627.219 512.939 619.621 526.1 606.818 529.53L300.95 611.487Z"
				fill="#C4EDFF"
			/>
			<path
				d="M-11.6831 551.311C-24.8971 552.351 -36.4521 542.482 -37.492 529.268L-69.45 123.163C-70.4899 109.949 -60.6208 98.3943 -47.4068 97.3544L358.698 65.3964C371.912 64.3565 383.467 74.2256 384.507 87.4396L416.465 493.544C417.505 506.758 407.636 518.313 394.422 519.353L-11.6831 551.311Z"
				fill="#BEFFDB"
			/>
			<path
				d="M19.803 468.567C13.1755 480.046 -1.50261 483.979 -12.9816 477.351L-287.215 319.022C-298.694 312.395 -302.627 297.717 -296 286.238L-137.671 12.004C-131.044 0.525003 -116.365 -3.40795 -104.886 3.21946L169.347 161.548C180.826 168.176 184.759 182.854 178.132 194.333L19.803 468.567Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}

function RightColoredShapes(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="466"
			height="210"
			viewBox="0 0 466 210"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M412.192 347.187C408.761 359.99 395.601 367.588 382.798 364.157L225.402 321.983C212.598 318.553 205 305.392 208.431 292.589L250.605 135.193C254.036 122.39 267.196 114.792 279.999 118.223L437.395 160.397C450.198 163.827 457.796 176.988 454.366 189.791L412.192 347.187Z"
				fill="#C4EDFF"
			/>
			<path
				d="M500.086 219.271C494.379 231.235 480.055 236.307 468.091 230.601L342.881 170.878C330.918 165.171 325.845 150.847 331.552 138.883L391.275 13.6732C396.981 1.7096 411.306 -3.36283 423.269 2.34361L548.479 62.0669C560.443 67.7733 565.515 82.0977 559.809 94.0613L500.086 219.271Z"
				fill="#BEFFDB"
			/>
			<path
				d="M267.38 283.913C274.008 295.392 270.075 310.071 258.596 316.698L117.478 398.172C105.999 404.8 91.321 400.867 84.6935 389.388L3.21937 248.27C-3.40805 236.791 0.524948 222.113 12.004 215.486L153.121 134.011C164.6 127.384 179.279 131.317 185.906 142.796L267.38 283.913Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
