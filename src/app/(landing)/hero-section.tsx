'use client';

import SplitText from '@/components/ui/animations/split-text';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Hero section with main headline and call-to-action buttons
 */
export function HeroSection() {
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
				<div className="flex flex-wrap items-center gap-4 lg:gap-[34px]">
					<Button
						asChild
						className="hover:bg-background h-[60px] w-[234px] border-2 border-black bg-black text-lg hover:text-black"
					>
						<Link href="/browse">Explore raffles</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						className="hover:text-background h-[60px] w-[238px] border-2 border-black text-lg text-black/95 hover:bg-black"
					>
						<Link href="/sign-up">Become a host</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
