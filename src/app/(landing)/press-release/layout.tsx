import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

import { env } from '@/env/server';

export const metadata: Metadata = {
	title: 'Press Release — Introducing Rafli | Raffly',
	description:
		'Rafli is a blockchain-backed raffle platform redefining transparency, trust, and excitement for hosts and participants alike.',
	keywords: [
		'rafli',
		'raffle platform',
		'blockchain raffle',
		'provably fair',
		'transparent raffle',
		'online raffle',
		'verified hosts',
		'on-chain selection',
	],
	alternates: {
		canonical: `${env.APP_URL}/press-release`,
	},
	openGraph: {
		title: 'Press Release — Introducing Rafli',
		description:
			'A blockchain-backed platform redefining transparency, trust, and excitement in the world of online raffles.',
		url: `${env.APP_URL}/press-release`,
		siteName: 'Raffly',
		type: 'article',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Press Release — Introducing Rafli',
		description:
			'Fair raffles, real prizes, no funny business. Blockchain-backed transparency for every draw.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

/**
 * JSON-LD structured data for Article schema.
 * Static content — no user input, safe for dangerouslySetInnerHTML.
 * Helps search engines display rich article snippets for the press release.
 */
const jsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Article',
	headline: 'Introducing Rafli — Raffles. Done Right.',
	description:
		'A blockchain-backed platform redefining transparency, trust, and excitement in the world of online raffles.',
	author: {
		'@type': 'Organization',
		name: 'Rafli',
	},
	publisher: {
		'@type': 'Organization',
		name: 'Rafli',
	},
	datePublished: '2026-02-24',
};

/**
 * Layout for Press Release page.
 *
 * Server Component — provides metadata and JSON-LD structured data for SEO.
 * Navbar/footer are rendered by the page component, not this layout, because
 * the press release page needs showDecoration=false on the Navbar.
 *
 * Data flow: children is the press-release page.tsx content. This layout only
 * wraps it with a JSON-LD script tag — no data fetching or auth checks.
 *
 * @returns Fragment with JSON-LD script + children
 */
export default function PressReleaseLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			{/* dangerouslySetInnerHTML is safe here: jsonLd is a hardcoded static object
			    with no user input — JSON.stringify produces a safe JSON string */}
			<Script
				id="press-release-jsonld"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			{children}
		</>
	);
}
