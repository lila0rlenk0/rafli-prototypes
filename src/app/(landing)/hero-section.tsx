'use client';

import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import Link from 'next/link';

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
		<section className="relative mx-auto max-w-[1720px] px-6 pt-16 pb-20 lg:px-[108px] lg:pt-[100px]">
			<div className="relative z-10">
				<p className="mb-4 text-center text-xl font-medium text-black lg:text-left lg:text-2xl">
					Fair Raffles • Real Prizes • No Funny Business
				</p>
				<h1 className="font-clash-display text-dark mb-6 text-6xl leading-none font-semibold lg:text-[160px]">
					<SplitText text="Raffles!" {...splitTextProps} />
					<br />
					<SplitText text="Done right!" {...splitTextProps} />
				</h1>
				<p className="mb-10 max-w-[1131px] text-xl font-medium text-black lg:text-2xl">
					Become verified hosts to run prize draws or join any raffle to win a
					prize!
				</p>
				<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center lg:gap-[34px]">
					<Button
						asChild
						className="hover:bg-background h-[60px] w-full border-2 border-black bg-black text-lg hover:text-black sm:w-[234px]"
					>
						<Link href="/browse">Explore raffles</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						className="hover:text-background h-[60px] w-full border-2 border-black text-lg text-black/95 hover:bg-black sm:w-[238px]"
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
