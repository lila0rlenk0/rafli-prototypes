import type { Metadata } from 'next';
import Script from 'next/script';

import { env } from '@/env/server';

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
		description:
			'Cryptographic verification for provably fair raffle results.',
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

/**
 * Layout for Verify pages
 *
 * Provides metadata and structured data for SEO.
 */
export default function VerifyLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Script
				id="verify-jsonld"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			{children}
		</>
	);
}
