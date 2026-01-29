'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { EnhancedTicketChecker } from '@/components/verification/enhanced-ticket-checker';
import { WinnerLookup } from '@/components/verification/winner-lookup';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

/**
 * Verify Page
 *
 * Universal verification hub for tickets and winners.
 */
export default function VerifyPage() {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<ScrollReveal>
				<header className="mb-12 text-center">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
						<ShieldCheck className="size-8 text-green-600" />
					</div>
					<h1 className="font-clash-display mb-3 text-4xl font-bold sm:text-5xl">
						Verify Any Result
					</h1>
					<p className="mx-auto max-w-2xl text-lg text-gray-600">
						Don&apos;t trust, verify. Check any ticket or winner using cryptographic proofs.
					</p>
				</header>
			</ScrollReveal>

			<div className="grid gap-6 md:grid-cols-2">
				<ScrollReveal delay={0.1}>
					<EnhancedTicketChecker />
				</ScrollReveal>

				<ScrollReveal delay={0.2}>
					<WinnerLookup />
				</ScrollReveal>
			</div>

			<ScrollReveal delay={0.3}>
				<div className="mt-12 rounded-2xl border bg-neutral-50 p-6 text-center">
					<h2 className="mb-2 text-lg font-semibold">How Verification Works</h2>
					<p className="mb-4 text-sm text-neutral-600">
						Every raffle on Raffly uses blockchain technology and cryptographic proofs
						to ensure results cannot be manipulated. Ticket data is locked before the draw,
						and random numbers come from an external, verifiable source.
					</p>
					<Link
						href="/how-it-works"
						className="inline-block rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
					>
						Learn More
					</Link>
				</div>
			</ScrollReveal>
		</div>
	);
}
