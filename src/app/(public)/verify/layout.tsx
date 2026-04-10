import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense, type ComponentProps, type ReactNode } from 'react';

import { PublicNavbar } from '@/components/ui/public-navbar';
import { ScreenLoader } from '@/components/ui/screen-loader';
import { env } from '@/env/server';
import { getSession } from '@/lib/auth/session';
import { parsePermissions } from '@/lib/permissions';
import { NotificationStoreProvider } from '@/providers/notification-store-provider';
import { UserStoreProvider } from '@/providers/user-store-provider';

export const metadata: Metadata = {
	title: 'Verify Raffle Results | Raffly',
	description:
		'Independently verify any raffle result using cryptographic proofs. Check ticket existence, winner selection, and blockchain records.',
	keywords: [
		'verify raffle',
		'raffle verification',
		'provably fair check',
		'ticket verification',
		'winner verification',
		'blockchain proof',
		'Merkle tree verification',
	],
	alternates: {
		canonical: `${env.APP_URL}/verify`,
	},
	openGraph: {
		title: 'Verify Raffle Results | Raffly',
		description:
			'Independently verify any raffle result using cryptographic proofs and blockchain records.',
		url: `${env.APP_URL}/verify`,
		siteName: 'Raffly',
		type: 'website',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Verify Raffle Results',
		description: 'Cryptographic verification for provably fair raffle results.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

/**
 * JSON-LD structured data for verification page
 * Static content - no user input, safe for dangerouslySetInnerHTML
 */
const jsonLd = {
	'@context': 'https://schema.org',
	'@type': 'WebApplication',
	name: 'Raffly Verification Tool',
	description:
		'Independently verify raffle results using cryptographic proofs and blockchain records.',
	applicationCategory: 'UtilitiesApplication',
	operatingSystem: 'Any',
	offers: {
		'@type': 'Offer',
		price: '0',
		priceCurrency: 'USD',
	},
	featureList: [
		'Ticket verification',
		'Winner verification',
		'Merkle proof display',
		'Blockchain transaction links',
		'IPFS manifest access',
	],
};

interface VerifyLayoutProps {
	children: ReactNode;
}

/**
 * Verify Layout Content
 *
 * Internal async component isolated behind Suspense — reads cookies via getSession.
 * Same auth-aware pattern as browse/host/how-it-works layouts.
 *
 * Data flow: session cookie → auth state → conditional UserStore + NotificationStore
 * wrapping. NotificationStoreProvider is required whenever the navbar is rendered for
 * an authenticated user because PublicNavbar mounts the NotificationBell, which calls
 * useNotificationStore and throws if the context is missing.
 */
async function VerifyLayoutContent({ children }: VerifyLayoutProps) {
	// Step 1: Read session from cookie.
	const session = await getSession();
	const isAuthenticated = !!session;

	// Step 2: Parse permissions for UserStoreProvider.
	const permissions = isAuthenticated
		? parsePermissions(session?.user?.permissions)
		: [];

	// Step 3: Build navbar shell — identical for both auth states, only providers differ.
	const content = (
		<PublicNavbar isAuthenticated={isAuthenticated}>{children}</PublicNavbar>
	);

	// Step 4: Wrap with auth stores only for authenticated users.
	// Guests skip providers — the navbar renders a Sign In button instead of the
	// NotificationBell, so no notification context is needed.
	if (isAuthenticated) {
		return (
			<UserStoreProvider permissions={permissions}>
				<NotificationStoreProvider>{content}</NotificationStoreProvider>
			</UserStoreProvider>
		);
	}

	return content;
}

/**
 * Layout for Verify pages
 *
 * Provides metadata, structured data for SEO, and public navbar.
 */
export default function VerifyLayout({ children }: VerifyLayoutProps) {
	return (
		<>
			{/* dangerouslySetInnerHTML safe: jsonLd is a static constant defined in this file
			    with no user input. JSON.stringify escapes any special characters. */}
			<Script
				id="verify-jsonld"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<main className="relative min-h-screen">
				<ColoredShapes className="pointer-events-none fixed top-0 left-0 z-[15] origin-top-left scale-[.65]" />
				<Suspense fallback={<ScreenLoader />}>
					<VerifyLayoutContent>{children}</VerifyLayoutContent>
				</Suspense>
			</main>
		</>
	);
}

/**
 * ColoredShapes Background Component
 *
 * Decorative SVG shapes for the page background.
 */
function ColoredShapes(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="851"
			height="559"
			viewBox="0 0 851 559"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M-243.831 -72.0817C-240.401 -84.8849 -227.241 -92.4829 -214.437 -89.0523L259.373 37.9049C272.176 41.3355 279.774 54.4956 276.344 67.2988L149.387 541.109C145.956 553.913 132.796 561.511 119.993 558.08L-353.818 431.123C-366.621 427.692 -374.219 414.532 -370.788 401.729L-243.831 -72.0817Z"
				fill="#C4EDFF"
			/>
			<path
				d="M29.0231 -362.816C34.7295 -374.779 49.0539 -379.852 61.0174 -374.145L624.656 -105.298C636.62 -99.5917 641.692 -85.2673 635.986 -73.3037L367.139 490.335C361.432 502.299 347.108 507.371 335.144 501.665L-228.495 232.817C-240.458 227.111 -245.531 212.787 -239.824 200.823L29.0231 -362.816Z"
				fill="#BEFFDB"
			/>
			<path
				d="M135.361 -172.953C128.734 -184.432 132.667 -199.11 144.146 -205.738L568.953 -451C580.432 -457.627 595.11 -453.694 601.738 -442.215L847 -17.4084C853.627 -5.92936 849.694 8.74883 838.215 15.3762L413.408 260.639C401.929 267.266 387.251 263.333 380.624 251.854L135.361 -172.953Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
