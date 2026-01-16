import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

import { Toaster } from '@/components/ui/sonner';
import { MixpanelProvider } from '@/providers/mixpanel-provider';

import './globals.css';

const clashDisplay = localFont({
	src: '../../public/fonts/ClashDisplay-Variable.ttf',
	variable: '--font-clash-display',
	weight: '100 900',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Raffly',
};

/**
 * Root Layout
 *
 * Application-wide layout providing fonts, analytics, and toast notifications.
 * Wraps all pages with MixpanelProvider for autocapture analytics.
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${GeistSans.variable} ${GeistMono.variable} ${clashDisplay.variable} antialiased`}
			>
				<MixpanelProvider>{children}</MixpanelProvider>
				<Toaster />
			</body>
		</html>
	);
}
