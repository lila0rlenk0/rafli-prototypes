import type { Metadata } from 'next';
import Link from 'next/link';

import { HowItWorksPrivacySection } from '@/components/landing/how-it-works/privacy-section';
import { HowItWorksProcessSection } from '@/components/landing/how-it-works/process-section';
import { HowItWorksProtocolDetailsSection } from '@/components/landing/how-it-works/protocol-details-section';
import { HowItWorksVerifySection } from '@/components/landing/how-it-works/verify-section';

export const metadata: Metadata = {
	title: 'How It Works',
	description:
		'Learn how Rafli sweepstakes select winners using blockchain-verified randomness and cryptographic proofs that anyone can independently verify.',
};

/**
 * How It Works Page.
 *
 * Educational page explaining the provably fair verification system.
 * Designed for clarity across tech and non-tech audiences, with
 * ADHD-friendly structure: icon-anchored steps, short paragraphs,
 * scannable cards, and generous whitespace.
 *
 * Layout:
 * 1. Hero — one sentence
 * 2. How a winner is picked — three icon-led cards
 * 3. Privacy wall — visual split between IPFS-public and never-public
 * 4. Verify your entry — icon-chip preview + interactive story
 * 5. Protocol details — collapsible dev recipe + code snippets
 * 6. CTA
 *
 * Server Component — the only interactive island is
 * `<TicketVerificationStory />` inside `<HowItWorksVerifySection />`.
 */
export default function HowItWorksPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			<header className="mb-16 text-center">
				<h1 className="font-clash-display mb-4 text-4xl font-bold sm:text-5xl">
					Every Winner Is Verifiable
				</h1>
				<p className="text-muted-foreground mx-auto max-w-2xl text-lg">
					You don&apos;t have to trust us. The proof is public.
				</p>
			</header>

			<HowItWorksProcessSection />
			<HowItWorksPrivacySection />
			<HowItWorksVerifySection />
			<HowItWorksProtocolDetailsSection />

			<section className="text-center">
				<p className="text-muted-foreground mb-4">
					Every winner on Rafli can be independently verified.
				</p>
				<Link
					href="/browse"
					className="bg-brand-dark border-brand-dark hover:text-brand-dark inline-block rounded-full border px-8 py-3 font-semibold text-white transition-colors hover:bg-white"
				>
					Browse Sweepstakes
				</Link>
			</section>
		</div>
	);
}
