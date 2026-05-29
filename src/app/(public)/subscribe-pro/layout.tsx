import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SubscribeShell } from '@/components/subscribe/subscribe-shell';
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
 * Public /subscribe-pro layout — owns SEO metadata for the Pro Access Pass
 * funnel. Shell is delegated to `SubscribeShell` to keep the dvh +
 * overflow-clip math in one place across the three funnel layouts.
 *
 * @param children - Page tree rendered inside the (public)/subscribe-pro route
 * @returns `SubscribeShell` wrapping the funnel route tree
 */
export default function SubscribeProLayout({
	children,
}: SubscribeProLayoutProps) {
	return <SubscribeShell>{children}</SubscribeShell>;
}
