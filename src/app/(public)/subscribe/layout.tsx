import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { env } from '@/env/server';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

const SUBSCRIBE_TITLE = 'Subscribe & Get Credits';
const SUBSCRIBE_DESCRIPTION =
	'Pay $10 and get $11 back in raffle credits. Save 10% on every bet, access exclusive content, and enter subscriber-only weekly pools.';

export const metadata: Metadata = {
	title: SUBSCRIBE_TITLE,
	description: SUBSCRIBE_DESCRIPTION,
	alternates: {
		canonical: `${env.APP_URL}/subscribe`,
	},
	openGraph: {
		title: SUBSCRIBE_TITLE,
		description: SUBSCRIBE_DESCRIPTION,
		url: `${env.APP_URL}/subscribe`,
		siteName: 'Rafli',
		type: 'website',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: SUBSCRIBE_TITLE,
		description: SUBSCRIBE_DESCRIPTION,
	},
	robots: {
		index: true,
		follow: true,
	},
};

interface SubscribeLayoutProps {
	readonly children: ReactNode;
}

/**
 * Public /subscribe layout — owns SEO metadata and the dvh page shell.
 *
 * `min-h-dvh` beats `min-h-screen` on mobile Safari (the browser chrome
 * respects dvh). The subscribe surface uses the minimal
 * `SubscribeNavbar` rather than `PublicNavbar`, so no auth provider
 * tree is required at the layout level — the page is a conversion
 * surface with zero auth-dependent UI in its shell.
 *
 * `overflow-x-clip` contains the countdown + CTA full-bleed sections
 * that escape the centered `max-w-hero` wrapper via
 * `w-screen left-1/2 -translate-x-1/2`. Without it, viewports wider
 * than 1440px would scroll horizontally because `100vw` outruns the
 * centered wrapper. `clip` (not `hidden`) avoids creating a scroll
 * container and keeps the decorative hero shapes visible.
 *
 * @param children - Page tree rendered inside the (public)/subscribe route
 * @returns Cream-canvas main wrapper
 */
export default function SubscribeLayout({ children }: SubscribeLayoutProps) {
	// Same gate as `/pricing` — the subscribe surface promotes the
	// subscription product, so it must stay invisible to crawlers and
	// users until `SUBSCRIPTION_ENABLED` flips. `notFound()` 404s the
	// route at the layout boundary, so the page tree never renders and
	// the embedded Fanbasis iframe never mints a session.
	if (!FEATURE_FLAGS.SUBSCRIPTION_ENABLED) notFound();

	return (
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			{children}
		</main>
	);
}
