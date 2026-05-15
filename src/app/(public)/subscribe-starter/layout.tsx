import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { env } from '@/env/server';

const SUBSCRIBE_TITLE = 'Subscribe Starter — 15% OFF + 5 free entries';
const SUBSCRIBE_DESCRIPTION =
	'Pay $25 and get $30 back in raffle credits. 15% OFF every entry, 5 free weekly-sweepstakes entries, and subscriber-only sweepstakes access.';

export const metadata: Metadata = {
	title: SUBSCRIBE_TITLE,
	description: SUBSCRIBE_DESCRIPTION,
	alternates: {
		canonical: `${env.APP_URL}/subscribe-starter`,
	},
	openGraph: {
		title: SUBSCRIBE_TITLE,
		description: SUBSCRIBE_DESCRIPTION,
		url: `${env.APP_URL}/subscribe-starter`,
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

interface SubscribeStarterLayoutProps {
	readonly children: ReactNode;
}

/**
 * Public /subscribe-starter layout — owns SEO metadata and the dvh page
 * shell for the Starter Access Pass funnel.
 *
 * `min-h-dvh` beats `min-h-screen` on mobile Safari (the browser chrome
 * respects dvh). `overflow-x-clip` contains the countdown + CTA
 * full-bleed sections that escape the centered `max-w-hero` wrapper via
 * `w-screen left-1/2 -translate-x-1/2`. Without it, viewports wider
 * than 1440px would scroll horizontally because `100vw` outruns the
 * centered wrapper. `clip` (not `hidden`) avoids creating a scroll
 * container and keeps the decorative hero shapes visible.
 *
 * @param children - Page tree rendered inside the (public)/subscribe-starter route
 * @returns Cream-canvas main wrapper
 */
export default function SubscribeStarterLayout({
	children,
}: SubscribeStarterLayoutProps) {
	return (
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			{children}
		</main>
	);
}
