import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { VerificationDeepDive } from '@/components/verification/verification-deep-dive';
import { env } from '@/env/server';

interface PageProps {
	params: Promise<{ raffleId: string }>;
}

/**
 * Generates metadata for raffle verification page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { raffleId } = await params;

	return {
		title: `Verify Raffle ${raffleId} | Raffly`,
		description: `Technical verification details for raffle ${raffleId}. View blockchain proofs, Merkle tree data, and winner selection formulas.`,
		alternates: {
			canonical: `${env.APP_URL}/verify/${raffleId}`,
		},
		openGraph: {
			title: `Verify Raffle ${raffleId} | Raffly`,
			description: 'Technical verification details with blockchain proofs and cryptographic data.',
			url: `${env.APP_URL}/verify/${raffleId}`,
			type: 'website',
		},
		robots: {
			index: true,
			follow: true,
		},
	};
}

/**
 * Raffle Verification Deep Dive Page
 *
 * Shows complete verification data for a specific raffle.
 */
export default async function RaffleVerificationPage({ params }: PageProps) {
	const { raffleId } = await params;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<Link
				href="/verify"
				className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
			>
				<ArrowLeft className="size-4" />
				Back to verification
			</Link>

			<header className="mb-8">
				<h1 className="font-clash-display text-3xl font-bold sm:text-4xl">
					Raffle Verification
				</h1>
				<p className="mt-2 text-neutral-600">
					Complete technical verification data with blockchain proofs.
				</p>
			</header>

			<VerificationDeepDive raffleId={raffleId} />
		</div>
	);
}
