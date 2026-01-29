import type { Metadata } from 'next';
import Script from 'next/script';

import { env } from '@/env/server';

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
		{ '@type': 'HowToTool', name: 'Chainlink VRF - Verifiable Random Function' },
		{ '@type': 'HowToTool', name: 'Arbitrum One - Ethereum L2 blockchain' },
		{ '@type': 'HowToTool', name: 'Merkle Trees - Cryptographic data structure' },
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

/**
 * Layout for How It Works page
 *
 * Provides metadata and structured data for SEO.
 */
export default function HowItWorksLayout({
	children,
}: {
	children: React.ReactNode;
}) {
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
			{children}
		</>
	);
}
