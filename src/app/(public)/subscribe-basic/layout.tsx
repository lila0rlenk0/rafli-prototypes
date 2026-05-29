import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SubscribeShell } from '@/components/subscribe/subscribe-shell';
import { env } from '@/env/server';

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
 * Public /subscribe-basic layout — owns SEO metadata for the Basic Access
 * Pass funnel. Shell is delegated to `SubscribeShell` to keep the dvh +
 * overflow-clip math in one place across the three funnel layouts.
 *
 * @param children - Page tree rendered inside the (public)/subscribe-basic route
 * @returns `SubscribeShell` wrapping the funnel route tree
 */
export default function SubscribeBasicLayout({
	children,
}: SubscribeBasicLayoutProps) {
	return <SubscribeShell>{children}</SubscribeShell>;
}
