import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense, type ComponentProps, type ReactNode } from 'react';

import { MarqueeBanner } from '@/components/browse/marquee-banner';
import { PublicNavbar } from '@/components/ui/public-navbar';
import { ScreenLoader } from '@/components/ui/screen-loader';
import { env } from '@/env/server';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { getSession } from '@/lib/auth/session';
import { parsePermissions } from '@/lib/permissions';
import { ChatStoreProvider } from '@/providers/chat-store-provider';
import { NotificationStoreProvider } from '@/providers/notification-store-provider';
import { UserStoreProvider } from '@/providers/user-store-provider';

export const metadata: Metadata = {
	title: 'Pricing | Rafli',
	description:
		'Subscribe to Rafli and unlock exclusive subscriber-only raffles, ticket discounts, and monthly credits. Launch pricing for early adopters.',
	alternates: {
		canonical: `${env.APP_URL}/pricing`,
	},
	openGraph: {
		title: 'Subscribe Today. Save. Win. | Rafli',
		description:
			'Get access to subscriber-only raffles, ticket discounts, and monthly credits when you subscribe to Rafli.',
		url: `${env.APP_URL}/pricing`,
		siteName: 'Rafli',
		type: 'website',
		locale: 'en_US',
	},
	// Twitter metadata mirrors /how-it-works so every public marketing
	// surface renders a consistent card when shared — previously the
	// pricing link fell back to the generic site-wide OG.
	twitter: {
		card: 'summary_large_image',
		title: 'Subscribe Today. Save. Win.',
		description:
			'Lock in permanent ticket discounts and free weekly pool entries with a one-time Rafli subscription.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

interface PricingLayoutProps {
	children: ReactNode;
}

/**
 * Pricing Layout Content
 *
 * Reads the auth session from cookies and conditionally wraps children
 * in the auth-aware provider tree — same contract as browse/how-it-works
 * layouts. Extracted behind Suspense because `getSession` blocks streaming
 * when called at the layout level.
 */
async function PricingLayoutContent({ children }: PricingLayoutProps) {
	// Step 1: Resolve session from httpOnly cookie — populates Sentry user
	// context for any error captured downstream in this request.
	const session = await getSession();
	const isAuthenticated = !!session;

	// Step 2: Parse permission bitmask — empty for guests, providers skipped.
	const permissions = isAuthenticated
		? parsePermissions(session?.user?.permissions)
		: [];

	// Step 3: Shared chrome for both auth states. MarqueeBanner sits between
	// the navbar and page content — matches the /browse surface so users
	// transitioning to /pricing feel they're still inside the same site shell.
	const content = (
		<PublicNavbar
			isAuthenticated={isAuthenticated}
			topBanner={<MarqueeBanner />}
		>
			{children}
		</PublicNavbar>
	);

	// Step 4: Only wrap in auth stores when logged in — hooks like
	// `useUserStore` guard against missing context for guests.
	if (isAuthenticated) {
		return (
			<UserStoreProvider permissions={permissions}>
				<NotificationStoreProvider>
					<ChatStoreProvider>{content}</ChatStoreProvider>
				</NotificationStoreProvider>
			</UserStoreProvider>
		);
	}

	return content;
}

/**
 * Decorative pastel shapes positioned behind the hero — identical palette
 * (blue / green / yellow) to the browse and how-it-works backgrounds so the
 * /pricing surface stays visually continuous with the rest of the app.
 * Fixed-position and `pointer-events-none` so it never intercepts clicks.
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

/**
 * Pricing Layout
 *
 * Server Component — Suspense wraps the auth-resolving inner content so the
 * rest of the tree can stream while the session cookie is being decoded.
 * Fallback is a full-screen loader (matches browse/how-it-works).
 */
export default function PricingLayout({ children }: PricingLayoutProps) {
	// Feature flag — returns 404 when subscriptions are disabled so the
	// route is invisible to crawlers and users until the flag is flipped.
	if (!FEATURE_FLAGS.SUBSCRIPTION_ENABLED) notFound();

	return (
		<main className="relative min-h-screen">
			<ColoredShapes className="pointer-events-none fixed top-0 left-0 z-[15] origin-top-left scale-[.65]" />
			<Suspense fallback={<ScreenLoader />}>
				<PricingLayoutContent>{children}</PricingLayoutContent>
			</Suspense>
		</main>
	);
}
