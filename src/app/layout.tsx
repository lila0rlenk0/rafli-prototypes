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
		'Rafli is a raffle platform built on blockchain technology to make every step of the process visible, verifiable, and fair. Enter now to win real prizes!',
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
			'Rafli is a raffle platform built on blockchain technology to make every step of the process visible, verifiable, and fair. Enter now to win real prizes!',
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
			'Rafli is a raffle platform built on blockchain technology to make every step of the process visible, verifiable, and fair. Enter now to win real prizes!',
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
 * Application-wide layout. Fonts, analytics, toast.
 * Suspense here is required for wagmi SSR hydration — ProvidersClient reads
 * the wagmi cookie in an async server component.
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" translate="no">
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
