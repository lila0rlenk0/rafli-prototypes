import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense, type ComponentProps, type ReactNode } from 'react';

import { PublicNavbar } from '@/components/ui-custom/public-navbar';
import { ScreenLoader } from '@/components/ui-custom/screen-loader';
import { env } from '@/env/server';
import { getSession } from '@/lib/auth/session';
import { parsePermissions } from '@/lib/permissions';
import { RealtimeProviders } from '@/providers/realtime-providers';
import { UserStoreProvider } from '@/providers/user-store-provider';

export const metadata: Metadata = {
	title: 'How Provably Fair Sweepstakes Work | Rafli',
	description:
		'Learn how Rafli uses blockchain technology, Chainlink VRF, and Merkle trees to ensure cryptographically verifiable sweepstakes results. No trust required.',
	keywords: [
		'provably fair sweepstakes',
		'blockchain sweepstakes',
		'verifiable random function',
		'Chainlink VRF',
		'Merkle tree verification',
		'transparent sweepstakes',
		'cryptographic proof',
		'fair drawing system',
	],
	alternates: {
		canonical: `${env.APP_URL}/how-it-works`,
	},
	openGraph: {
		title: 'How Provably Fair Sweepstakes Work | Rafli',
		description:
			'Learn how Rafli uses blockchain technology and cryptographic proofs to ensure fair, verifiable sweepstakes results that anyone can audit.',
		url: `${env.APP_URL}/how-it-works`,
		siteName: 'Rafli',
		type: 'article',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'How Provably Fair Sweepstakes Work',
		description:
			'Blockchain-powered sweepstakes with cryptographic proofs. Every winner verifiable.',
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
	name: 'How Provably Fair Sweepstakes Work',
	description:
		'Learn how Rafli uses blockchain technology and cryptographic proofs to ensure fair, verifiable sweepstakes results.',
	step: [
		{
			'@type': 'HowToStep',
			name: 'Manifest Creation',
			text: 'When sales close, a complete list of all entries with their owners is created and uploaded to IPFS.',
		},
		{
			'@type': 'HowToStep',
			name: 'Blockchain Commitment',
			text: "The manifest's unique fingerprint (hash) is recorded on the Arbitrum blockchain, proving the entry list existed at a specific time.",
		},
		{
			'@type': 'HowToStep',
			name: 'Random Number Request',
			text: 'A random number is requested from Chainlink VRF, requiring blockchain confirmation for verifiable randomness.',
		},
		{
			'@type': 'HowToStep',
			name: 'Winner Selection',
			text: 'The random number is applied to the committed entry list using a public, verifiable formula.',
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
			name: 'What is a provably fair sweepstakes?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'A provably fair sweepstakes uses cryptographic proofs and blockchain technology to ensure that results cannot be manipulated. Anyone can independently verify that the winner was selected fairly.',
			},
		},
		{
			'@type': 'Question',
			name: 'How does Chainlink VRF work?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Chainlink VRF (Verifiable Random Function) generates random numbers on the blockchain that are cryptographically provable. Neither Rafli nor any third party can predict or influence the random number.',
			},
		},
		{
			'@type': 'Question',
			name: 'Can I verify sweepstakes results myself?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Yes. Every sweepstakes on Rafli includes blockchain transaction links, IPFS manifest links, and the exact formula used for winner selection. Anyone can independently verify the results.',
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
 * Internal async component isolated behind Suspense — reads cookies via getSession
 * which would block streaming if called at the layout level.
 *
 * Data flow: session cookie → auth state → conditionally wrap with auth stores.
 * Same pattern as browse and host layouts.
 */
async function HowItWorksLayoutContent({ children }: HowItWorksLayoutProps) {
	// Step 1: Read session from httpOnly cookie.
	const session = await getSession();
	const isAuthenticated = !!session;

	// Step 2: Parse permissions for provider tree.
	const permissions = isAuthenticated
		? parsePermissions(session?.user?.permissions)
		: [];

	// Step 3: Build navbar + conditional provider wrapping.
	const content = (
		<PublicNavbar isAuthenticated={isAuthenticated}>{children}</PublicNavbar>
	);

	if (isAuthenticated) {
		return (
			<UserStoreProvider permissions={permissions}>
				<RealtimeProviders>{content}</RealtimeProviders>
			</UserStoreProvider>
		);
	}

	return content;
}

/**
 * DecorativeShapes — CSS-based background decoration.
 *
 * Three rotated, blurred rectangles in brand colors (#C4EDFF blue, #BEFFDB green,
 * #F6FF8B yellow) matching the palette used across browse, verify, and host layouts.
 * Uses CSS transforms + blur instead of SVG paths for a softer, more subtle effect.
 */
function DecorativeShapes(props: ComponentProps<'div'>) {
	return (
		<div aria-hidden {...props}>
			{/* Blue — large, slightly rotated left */}
			<div className="bg-brand-sky absolute -top-20 -left-40 h-100 w-125 -rotate-12 rounded-3xl opacity-50 blur-2xl" />
			{/* Green — overlapping, steeper rotation */}
			<div className="rotate-tilt-lg bg-brand-mint absolute -top-60 -left-20 h-100 w-125 rounded-3xl opacity-50 blur-2xl" />
			{/* Yellow — smallest, angled furthest */}
			<div className="bg-brand-yellow absolute -top-40 left-10 h-87.5 w-112.5 rotate-45 rounded-3xl opacity-50 blur-2xl" />
		</div>
	);
}

/**
 * Layout for How It Works page
 *
 * Provides metadata, structured data for SEO, and public navbar.
 */
export default function HowItWorksLayout({ children }: HowItWorksLayoutProps) {
	return (
		<>
			{/* dangerouslySetInnerHTML safe: jsonLd and faqJsonLd are static constants defined
			    in this file with no user input. JSON.stringify escapes any special characters. */}
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
			<main className="relative min-h-dvh">
				{/*
				 * Decorative shapes — CSS divs instead of raw SVG paths.
				 * Uses the same brand colors (#C4EDFF blue, #BEFFDB green, #F6FF8B yellow)
				 * as other layouts (browse, verify, host) for visual consistency.
				 * Blur + reduced opacity creates a softer, less distracting atmosphere
				 * compared to the hard-edged SVG version.
				 */}
				<DecorativeShapes className="scale-xs pointer-events-none fixed top-0 left-0 z-(--z-sticky) origin-top-left" />
				<Suspense fallback={<ScreenLoader />}>
					<HowItWorksLayoutContent>{children}</HowItWorksLayoutContent>
				</Suspense>
			</main>
		</>
	);
}
