import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { clientEnv } from '@/env/client';
import { env } from '@/env/server';

// Production-only kill switch. The repo standardizes on `NEXT_PUBLIC_APP_ENV`
// as the deploy-target discriminator (set per Vercel environment in project
// settings: Production='production', Preview='staging', Development=
// 'development'). The funnel only disappears on rafli.win — staging.rafli.win
// and PR previews keep it reachable for QA.
const IS_HIDDEN_IN_PRODUCTION = clientEnv.NEXT_PUBLIC_APP_ENV === 'production';

const SUBSCRIBE_TITLE = 'Subscribe Basic — Save 10% on every entry';
const SUBSCRIBE_DESCRIPTION =
	'Pay $10 and get $11 back in raffle credits. Save 10% on every entry, expired credits convert into monthly-pool entries, and unlock the 10k+ content library.';

export const metadata: Metadata = {
	title: SUBSCRIBE_TITLE,
	description: SUBSCRIBE_DESCRIPTION,
	alternates: {
		canonical: `${env.APP_URL}/subscribe-basic`,
	},
	openGraph: {
		title: SUBSCRIBE_TITLE,
		description: SUBSCRIBE_DESCRIPTION,
		url: `${env.APP_URL}/subscribe-basic`,
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

interface SubscribeBasicLayoutProps {
	readonly children: ReactNode;
}

/**
 * Public /subscribe-basic layout — owns SEO metadata and the dvh page
 * shell for the Basic Access Pass funnel.
 *
 * `min-h-dvh` beats `min-h-screen` on mobile Safari (the browser chrome
 * respects dvh). `overflow-x-clip` contains the countdown + CTA
 * full-bleed sections that escape the centered `max-w-hero` wrapper via
 * `w-screen left-1/2 -translate-x-1/2`. Without it, viewports wider
 * than 1440px would scroll horizontally because `100vw` outruns the
 * centered wrapper. `clip` (not `hidden`) avoids creating a scroll
 * container and keeps the decorative hero shapes visible.
 *
 * @param children - Page tree rendered inside the (public)/subscribe-basic route
 * @returns Cream-canvas main wrapper
 */
export default function SubscribeBasicLayout({
	children,
}: SubscribeBasicLayoutProps) {
	// Hide the funnel on the production target — render the closest
	// not-found.tsx with a 404 status so crawlers and direct visitors see
	// the route as nonexistent. Triggers from the layout so any future
	// nested /subscribe-basic/* segment is gated automatically.
	if (IS_HIDDEN_IN_PRODUCTION) {
		notFound();
	}

	return (
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			{children}
		</main>
	);
}
