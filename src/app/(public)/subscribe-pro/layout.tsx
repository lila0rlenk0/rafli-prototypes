import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { env } from '@/env/server';

const SUBSCRIBE_TITLE = 'Subscribe Pro — 20% OFF + 25 free entries';
const SUBSCRIBE_DESCRIPTION =
	'Pay $100 and get $125 back in raffle credits. 20% OFF every entry, 25 free weekly-sweepstakes entries, priority access to limited-capacity sweepstakes.';

export const metadata: Metadata = {
	title: SUBSCRIBE_TITLE,
	description: SUBSCRIBE_DESCRIPTION,
	alternates: {
		canonical: `${env.APP_URL}/subscribe-pro`,
	},
	openGraph: {
		title: SUBSCRIBE_TITLE,
		description: SUBSCRIBE_DESCRIPTION,
		url: `${env.APP_URL}/subscribe-pro`,
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

interface SubscribeProLayoutProps {
	readonly children: ReactNode;
}

/**
 * Public /subscribe-pro layout — owns SEO metadata and the dvh page
 * shell for the Pro Access Pass funnel.
 *
 * `min-h-dvh` beats `min-h-screen` on mobile Safari (the browser chrome
 * respects dvh). `overflow-x-clip` contains the countdown + CTA
 * full-bleed sections that escape the centered `max-w-hero` wrapper via
 * `w-screen left-1/2 -translate-x-1/2`. Without it, viewports wider
 * than 1440px would scroll horizontally because `100vw` outruns the
 * centered wrapper. `clip` (not `hidden`) avoids creating a scroll
 * container and keeps the decorative hero shapes visible.
 *
 * @param children - Page tree rendered inside the (public)/subscribe-pro route
 * @returns Cream-canvas main wrapper
 */
export default function SubscribeProLayout({
	children,
}: SubscribeProLayoutProps) {
	return (
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			{children}
		</main>
	);
}
