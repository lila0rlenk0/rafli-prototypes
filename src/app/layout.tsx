import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import localFont from 'next/font/local';
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
				{children}
			</body>
		</html>
	);
}
