import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SubscribeShell } from '@/components/subscribe/subscribe-shell';
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
 * Public /subscribe-starter layout — owns SEO metadata for the Starter Access
 * Pass funnel. Shell is delegated to `SubscribeShell` to keep the dvh +
 * overflow-clip math in one place across the three funnel layouts.
 *
 * @param children - Page tree rendered inside the (public)/subscribe-starter route
 * @returns `SubscribeShell` wrapping the funnel route tree
 */
export default function SubscribeStarterLayout({
	children,
}: SubscribeStarterLayoutProps) {
	return <SubscribeShell>{children}</SubscribeShell>;
}
