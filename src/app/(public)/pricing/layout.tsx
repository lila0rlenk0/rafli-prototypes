import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { MarqueeBanner } from '@/components/browse/marquee-banner';
import { PricingHeroDecor } from '@/components/pricing/hero-decor';
import { PublicNavbar } from '@/components/ui-custom/public-navbar';
import { ScreenLoader } from '@/components/ui-custom/screen-loader';
import { env } from '@/env/server';
import { getSession } from '@/lib/auth/session';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { parsePermissions } from '@/lib/permissions';
import { RealtimeProviders } from '@/providers/realtime-providers';
import { UserStoreProvider } from '@/providers/user-store-provider';

export const metadata: Metadata = {
	title: 'Pricing | Rafli',
	description:
		'Subscribe to Rafli and unlock exclusive subscriber-only sweepstakes, entry discounts, and monthly credits. Launch pricing for early adopters.',
	alternates: {
		canonical: `${env.APP_URL}/pricing`,
	},
	openGraph: {
		title: 'Subscribe Today. Save. Win. | Rafli',
		description:
			'Get access to subscriber-only sweepstakes, entry discounts, and monthly credits when you subscribe to Rafli.',
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
			'Lock in permanent entry discounts and free weekly pool entries with a one-time Rafli subscription.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

interface PricingLayoutProps {
	children: ReactNode;
}

const PRICING_MARQUEE_MESSAGE =
	'Share selected sweepstakes on X and get free entries!';

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

	// Step 3: Shared chrome for both auth states. Pricing now intentionally
	// reuses the yellow marquee treatment from the design handoff so the
	// conversion flow has a consistent "social-share reward" surface.
	const content = (
		<PublicNavbar
			isAuthenticated={isAuthenticated}
			topBanner={<MarqueeBanner message={PRICING_MARQUEE_MESSAGE} />}
		>
			{children}
		</PublicNavbar>
	);

	// Step 4: Only wrap in auth stores when logged in — hooks like
	// `useUserStore` guard against missing context for guests.
	if (isAuthenticated) {
		return (
			<UserStoreProvider permissions={permissions}>
				<RealtimeProviders>{content}</RealtimeProviders>
			</UserStoreProvider>
		);
	}

	return content;
}

/**
 * Pricing Layout
 *
 * Server Component — Suspense wraps the auth-resolving inner content so the
 * rest of the tree can stream while the session cookie is being decoded.
 * Fallback is a full-screen loader (matches browse/how-it-works).
 *
 * Decor placement:
 *   The Figma reference clusters three brand-color rounded squares in the
 *   upper-left of the page (bleeding off the viewport edge), behind the
 *   navbar/marquee/hero copy. We render `PricingHeroDecor` here at the
 *   layout level — NOT inside the centered hero section — because the
 *   hero is `mx-auto max-w-copy` and would anchor the cluster to the
 *   centered column, drifting the squares into the middle of the page.
 *   At the `<main>` level the decor anchors to the viewport's top-left
 *   and the `overflow-x-clip` shell crops the bleed cleanly at the
 *   viewport edge, exactly matching the Figma frame.
 *
 * Stacking:
 *   `isolate` opens a stacking context scoped to `<main>` so the decor's
 *   `-z-10` only goes below sibling content within main (Suspense /
 *   navbar / page tree) — without `isolate` the negative z would escape
 *   to the root context and disappear beneath the body's painted bg.
 *
 * `overflow-x-clip` contains the decor cluster — the squares extend past
 * the viewport's left edge, and `clip` crops the horizontal bleed without
 * creating a scroll container (the way `overflow-x-hidden` would).
 */
export default function PricingLayout({ children }: PricingLayoutProps) {
	// `notFound()` (not `redirect`) so external probes can't tell whether
	// pricing is hidden behind a flag or simply doesn't exist yet — same
	// opacity strategy as the `/subscribe` and `/messages` gates. Lives
	// in the layout so any nested route under `/pricing/*` inherits it.
	if (!FEATURE_FLAGS.PRICING_PAGE_ENABLED) notFound();

	return (
		<main className="relative isolate min-h-dvh overflow-x-clip">
			<PricingHeroDecor />
			<Suspense fallback={<ScreenLoader />}>
				<PricingLayoutContent>{children}</PricingLayoutContent>
			</Suspense>
		</main>
	);
}
