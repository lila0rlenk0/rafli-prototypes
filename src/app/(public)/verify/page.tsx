import { ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { EnhancedTicketChecker } from '@/components/verification/enhanced-ticket-checker';
import { WinnerLookup } from '@/components/verification/winner-lookup';

// next/dynamic: lazy-loaded because ScrollReveal pulls in GSAP + ScrollTrigger (~40KB).
// Verify page content is static — scroll animations are progressive enhancement,
// so deferring this import doesn't affect core functionality or SEO.
const ScrollReveal = dynamic(() =>
	import('@/components/ui-custom/scroll-reveal').then(mod => ({
		default: mod.ScrollReveal,
	})),
);

/**
 * Query params accepted by the verify page.
 * Used to pre-fill the ticket checker form when linking here from the
 * ticket-codes table on a concluded raffle.
 */
interface VerifyPageProps {
	searchParams: Promise<{
		raffle?: string;
		code?: string;
	}>;
}

/**
 * Verify Page
 *
 * Universal verification hub for tickets and winners.
 *
 * Server Component — reads searchParams on the server and passes them as
 * props to the client `EnhancedTicketChecker`. This avoids pulling in the
 * `useSearchParams()` client hook, which would require a Suspense boundary
 * and opt the page out of static rendering.
 */
export default async function VerifyPage({ searchParams }: VerifyPageProps) {
	// Resolve Next.js 15 async searchParams before passing to the client form.
	const { raffle, code } = await searchParams;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<ScrollReveal>
				<header className="mb-12 text-center">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center">
						<ShieldCheck className="size-24" />
					</div>
					<h1 className="font-clash-display mb-3 text-3xl font-bold sm:text-5xl">
						Verify Any Result
					</h1>
					<p className="mx-auto max-w-2xl text-lg text-gray-600">
						Don&apos;t trust, verify. Check any entry or winner using
						cryptographic proofs.
					</p>
				</header>
			</ScrollReveal>

			<div className="grid gap-6 md:grid-cols-2">
				<ScrollReveal delay={0.1}>
					{/*
					 * `key` forces a remount whenever the query params change so the
					 * client component re-seeds `useState` from the new props. Without
					 * this, navigating from /verify?raffle=A&code=X to /verify?raffle=B
					 * &code=Y keeps the previous form state and verification result
					 * (same route, no natural unmount). `'empty'` sentinel when both
					 * are absent so the bare /verify page shares a single mount.
					 */}
					<EnhancedTicketChecker
						key={raffle || code ? `${raffle ?? ''}:${code ?? ''}` : 'empty'}
						initialRaffleSlug={raffle}
						initialTicketCode={code}
					/>
				</ScrollReveal>

				<ScrollReveal delay={0.2}>
					<WinnerLookup />
				</ScrollReveal>
			</div>

			<ScrollReveal delay={0.3}>
				<div className="mt-12 rounded-2xl border border-black bg-white p-6 text-center">
					<h2 className="mb-2 text-lg font-semibold">How Verification Works</h2>
					<p className="mb-4 text-sm text-neutral-600">
						Every sweepstakes on Rafli uses blockchain technology and
						cryptographic proofs to ensure results cannot be manipulated. Entry
						data is locked before the draw, and random numbers come from an
						external, verifiable source.
					</p>
					<Link
						href="/how-it-works"
						className="inline-block rounded-full border-2 border-black bg-black px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
					>
						Learn More
					</Link>
				</div>
			</ScrollReveal>
		</div>
	);
}
