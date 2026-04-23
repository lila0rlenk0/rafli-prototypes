import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Suspense } from 'react';

import { Toaster } from '@/components/ui/sonner';

import './globals.css';
import { ProvidersClient } from './providers-client';

const clashDisplay = localFont({
	src: '../../public/fonts/ClashDisplay-Variable.ttf',
	variable: '--font-clash-display',
	weight: '100 900',
	display: 'swap',
});

export const metadata: Metadata = {
	metadataBase: new URL('https://www.rafli.win'),
	title: {
		default: 'Rafli – Fair Sweepstakes & Real Prizes',
		template: '%s | Rafli',
	},
	description:
		'Rafli is a sweepstakes platform built on blockchain technology to make every step of the process visible, verifiable, and fair. Enter now — no purchase necessary — to win real prizes!',
	keywords: [
		'sweepstakes',
		'prize draw',
		'win prizes',
		'fair sweepstakes',
		'verified host',
		'real prizes',
		'online sweepstakes',
		'no purchase necessary',
	],
	openGraph: {
		type: 'website',
		locale: 'en_US',
		url: 'https://www.rafli.win',
		siteName: 'Rafli',
		title: 'Rafli – Fair Sweepstakes & Real Prizes',
		description:
			'Rafli is a sweepstakes platform built on blockchain technology to make every step of the process visible, verifiable, and fair. Enter now — no purchase necessary — to win real prizes!',
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
		title: 'Rafli – Fair Sweepstakes & Real Prizes',
		description:
			'Rafli is a sweepstakes platform built on blockchain technology to make every step of the process visible, verifiable, and fair. Enter now — no purchase necessary — to win real prizes!',
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
 *
 * Web3 (wagmi + Reown AppKit) is route-scoped at
 * `src/app/(public)/browse/[publicSlug]/layout.tsx` — mounting it here would
 * ship the Reown + wagmi + viem chunk to every route.
 *
 * The Suspense boundary below is REQUIRED by `cacheComponents: true` in
 * `next.config.ts`: it separates the static HTML shell from the client
 * provider tree, which reads request-time data (`usePathname` in
 * `MixpanelProvider`). Without it, Next.js 16 fails prerender with
 * "Uncached data was accessed outside of <Suspense>" on any route whose
 * layout doesn't already supply its own boundary.
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" translate="no">
			{/* suppressHydrationWarning: browser extensions (ad blockers, Grammarly,
			    translation tools) inject attributes/elements into <body> between
			    server render and hydration — without this flag React throws a
			    hydration mismatch error for mutations we don't control. */}
			<body
				suppressHydrationWarning
				className={`${GeistSans.variable} ${GeistMono.variable} ${clashDisplay.variable} font-sans antialiased`}
			>
				<Suspense fallback={null}>
					<ProvidersClient>
						{children}
						<Toaster />
					</ProvidersClient>
				</Suspense>
			</body>
		</html>
	);
}
