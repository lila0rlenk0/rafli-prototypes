'use client';

import { ScrollReveal } from '@/components/ui-custom/scroll-reveal';

/**
 * Press release hero — intro banner with decorative shapes, "Introducing
 * Rafli" pill, oversized headline, and the elevator pitch paragraph.
 */
export function PressArticleHero() {
	return (
		<section className="bg-background relative overflow-hidden px-6 pt-16 pb-24 sm:px-10">
			<div className="rotate-tilt-md rounded-pill-2xl bg-mint-200 absolute -top-15 -right-15 size-85" />
			<div className="rounded-pill-lg absolute -bottom-10 left-15 size-50 -rotate-12 bg-yellow-400" />

			<ScrollReveal>
				<div className="tracking-caps-5 text-green-strong mb-5 text-xs font-semibold uppercase">
					Introducing Rafli
				</div>
				<h1 className="font-clash-display text-foreground max-w-reading text-display-fluid-xl/display tracking-display-tight mb-7 font-extrabold">
					Sweepstakes.
					<br />
					<span className="text-green-strong">Done right.</span>
				</h1>
				<p className="text-foreground/55 max-w-card text-lg/loose font-light">
					A new blockchain-backed platform is redefining transparency, trust,
					and excitement in the world of online sweepstakes — for hosts and
					participants alike.
				</p>
			</ScrollReveal>
		</section>
	);
}
