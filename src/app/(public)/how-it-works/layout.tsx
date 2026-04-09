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
	title: 'How Provably Fair Raffles Work | Raffly',
	description:
		'Learn how Raffly uses blockchain technology, Chainlink VRF, and Merkle trees to ensure cryptographically verifiable raffle results. No trust required.',
	keywords: [
		'provably fair raffle',
		'blockchain raffle',
		'verifiable random function',
		'Chainlink VRF',
		'Merkle tree verification',
		'transparent lottery',
		'cryptographic proof',
		'fair drawing system',
	],
	alternates: {
		canonical: `${env.APP_URL}/how-it-works`,
	},
	openGraph: {
		title: 'How Provably Fair Raffles Work | Raffly',
		description:
			'Learn how Raffly uses blockchain technology and cryptographic proofs to ensure fair, verifiable raffle results that anyone can audit.',
		url: `${env.APP_URL}/how-it-works`,
		siteName: 'Raffly',
		type: 'article',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'How Provably Fair Raffles Work',
		description:
			'Blockchain-powered raffles with cryptographic proofs. Every winner verifiable.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

/**
 * JSON-LD structured data for HowTo schema
 * Static content - no user input, safe for dangerouslySetInnerHTML
 */
const jsonLd = {
	'@context': 'https://schema.org',
	'@type': 'HowTo',
	name: 'How Provably Fair Raffles Work',
	description:
		'Learn how Raffly uses blockchain technology and cryptographic proofs to ensure fair, verifiable raffle results.',
	step: [
		{
			'@type': 'HowToStep',
			name: 'Manifest Creation',
			text: 'When sales close, a complete list of all tickets with their owners is created and uploaded to IPFS.',
		},
		{
			'@type': 'HowToStep',
			name: 'Blockchain Commitment',
			text: "The manifest's unique fingerprint (hash) is recorded on the Arbitrum blockchain, proving the ticket list existed at a specific time.",
		},
		{
			'@type': 'HowToStep',
			name: 'Random Number Request',
			text: 'A random number is requested from Chainlink VRF, requiring blockchain confirmation for verifiable randomness.',
		},
		{
			'@type': 'HowToStep',
			name: 'Winner Selection',
			text: 'The random number is applied to the committed ticket list using a public, verifiable formula.',
		},
	],
	tool: [
		{ '@type': 'HowToTool', name: 'IPFS - Decentralized storage' },
		{
			'@type': 'HowToTool',
			name: 'Chainlink VRF - Verifiable Random Function',
		},
		{ '@type': 'HowToTool', name: 'Arbitrum One - Ethereum L2 blockchain' },
		{
			'@type': 'HowToTool',
			name: 'Merkle Trees - Cryptographic data structure',
		},
	],
};

/**
 * FAQ structured data for common questions
 * Static content - no user input, safe for dangerouslySetInnerHTML
 */
const faqJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	mainEntity: [
		{
			'@type': 'Question',
			name: 'What is a provably fair raffle?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'A provably fair raffle uses cryptographic proofs and blockchain technology to ensure that results cannot be manipulated. Anyone can independently verify that the winner was selected fairly.',
			},
		},
		{
			'@type': 'Question',
			name: 'How does Chainlink VRF work?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Chainlink VRF (Verifiable Random Function) generates random numbers on the blockchain that are cryptographically provable. Neither Raffly nor any third party can predict or influence the random number.',
			},
		},
		{
			'@type': 'Question',
			name: 'Can I verify raffle results myself?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Yes. Every raffle on Raffly includes blockchain transaction links, IPFS manifest links, and the exact formula used for winner selection. Anyone can independently verify the results.',
			},
		},
	],
};

interface HowItWorksLayoutProps {
	children: ReactNode;
}

/**
 * How It Works Layout Content
 *
 * Internal component that accesses runtime data (cookies via getSession).
 * Must be wrapped in Suspense to prevent blocking the entire page render.
 */
async function HowItWorksLayoutContent({ children }: HowItWorksLayoutProps) {
	const session = await getSession();
	const isAuthenticated = !!session;
	const permissions = isAuthenticated
		? parsePermissions(session?.user?.permissions)
		: [];

	const content = (
		<PublicNavbar isAuthenticated={isAuthenticated}>{children}</PublicNavbar>
	);

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
 * Layout for How It Works page
 *
 * Provides metadata, structured data for SEO, and public navbar.
 */
export default function HowItWorksLayout({ children }: HowItWorksLayoutProps) {
	return (
		<>
			<Script
				id="how-it-works-jsonld"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<Script
				id="how-it-works-faq-jsonld"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
			/>
			<main className="relative min-h-screen">
				<ColoredShapes className="pointer-events-none fixed top-0 left-0 z-[15] origin-top-left scale-[.65]" />
				<Suspense fallback={<ScreenLoader />}>
					<HowItWorksLayoutContent>{children}</HowItWorksLayoutContent>
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
