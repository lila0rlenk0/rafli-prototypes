import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Suspense } from 'react';

import { Toaster } from '@/components/ui/sonner';

import './globals.css';
import { Providers } from './providers';

const clashDisplay = localFont({
	src: '../../public/fonts/ClashDisplay-Variable.ttf',
	variable: '--font-clash-display',
	weight: '100 900',
	display: 'swap',
});

export const metadata: Metadata = {
	metadataBase: new URL('https://www.rafli.win'),
	title: {
		default: 'Rafli – Fair Raffles & Real Prizes',
		template: '%s | Rafli',
	},
	description:
		'Become a verified host to run prize draws, or join any raffle to win real prizes. Fair, transparent, and trusted.',
	keywords: [
		'raffle',
		'prize draw',
		'win prizes',
		'fair raffle',
		'verified host',
		'real prizes',
		'online raffle',
	],
	openGraph: {
		type: 'website',
		locale: 'en_US',
		url: 'https://www.rafli.win',
		siteName: 'Rafli',
		title: 'Rafli – Fair Raffles & Real Prizes',
		description:
			'Become a verified host to run prize draws, or join any raffle to win real prizes. Fair, transparent, and trusted.',
		images: [
			{
				url: '/web-app-manifest-512x512.png',
				width: 512,
				height: 512,
				alt: 'Rafli logo',
			},
		],
	},
	twitter: {
		card: 'summary',
		title: 'Rafli – Fair Raffles & Real Prizes',
		description:
			'Become a verified host to run prize draws, or join any raffle to win real prizes. Fair, transparent, and trusted.',
		images: ['/web-app-manifest-512x512.png'],
	},
	appleWebApp: {
		title: 'Rafli',
	},
	robots: {
		index: true,
		follow: true,
	},
};

/**
 * Root Layout
 *
 * Application-wide layout providing fonts, analytics, and toast notifications.
 * Wraps all pages with MixpanelProvider for autocapture analytics.
 */
export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${GeistSans.variable} ${GeistMono.variable} ${clashDisplay.variable} font-sans antialiased`}
			>
				<Suspense fallback={null}>
					<Providers>
						{children}
						<Toaster />
					</Providers>
				</Suspense>
			</body>
		</html>
	);
}
