'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

// GSAP-dependent — dynamic import avoids loading the full GSAP bundle upfront
const SplitText = dynamic(
	() => import('@/components/ui/animations/split-text'),
);

/**
 * Hero section with main headline and call-to-action buttons.
 *
 * 'use client' required: SplitText (GSAP animation) uses IntersectionObserver
 * and DOM manipulation which require a browser environment.
 *
 * @returns Hero section with animated headline and two CTA buttons
 */
export function HeroSection() {
	/** Shared animation config for SplitText headline — chars animate in sequence */
	const splitTextProps = {
		delay: 50,
		duration: 1.25,
		ease: 'power3.out',
		splitType: 'chars',
		from: { opacity: 0, y: 40 },
		to: { opacity: 1, y: 0 },
		threshold: 0.1,
		rootMargin: '-100px',
		textAlign: 'center',
	} as const;

	return (
		<section className="max-w-wide relative mx-auto px-6 pt-16 pb-20 lg:px-27 lg:pt-25">
			<div className="relative z-10">
				<p className="mb-4 text-center text-xl font-medium text-black lg:text-left lg:text-2xl">
					Fair Sweepstakes • Real Prizes • No Funny Business
				</p>
				<h1 className="font-clash-display text-brand-dark lg:text-160 mb-6 text-6xl/none font-semibold">
					<SplitText text="Sweepstakes!" {...splitTextProps} />
					<br />
					<SplitText text="Done right!" {...splitTextProps} />
				</h1>
				<p className="max-w-pricing mb-10 text-xl font-medium text-black lg:text-2xl">
					Become a verified host to run prize draws, or enter exclusive
					sweepstakes — no purchase necessary, free entry always available.
				</p>
				<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center lg:gap-8.5">
					<Button
						asChild
						className="hover:bg-background h-15 w-full border-2 border-black bg-black text-lg hover:text-black sm:w-58.5"
					>
						<Link href="/browse">Explore sweepstakes</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						className="hover:text-background h-15 w-full border-2 border-black text-lg text-black/95 hover:bg-black sm:w-59.5"
					>
						<Link href="https://forms.gle/RqihwzjyBcjjwUa97">
							Become a host
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
