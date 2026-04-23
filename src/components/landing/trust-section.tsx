'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

import { TicketIcon } from '@/assets/ticket-icon';

// GSAP-dependent — dynamic import avoids loading the full GSAP bundle upfront
const SplitText = dynamic(
	() => import('@/components/ui/animations/split-text'),
);

/** Platform participation steps — displayed as stacked animated cards */
const steps = [
	{
		number: 1,
		text: 'Browse sweepstakes or decide to host one',
		variant: 'green' as const,
	},
	{
		number: 2,
		text: 'Hosts complete a quick verification step',
		variant: 'green' as const,
	},
	{
		number: 3,
		text: 'Join or launch sweepstakes with clear rules',
		variant: 'green' as const,
	},
	{
		number: 4,
		text: 'Winners are selected transparently',
		variant: 'green' as const,
	},
	{
		number: 5,
		text: 'Results are visible and trackable on-chain',
		variant: 'yellow' as const,
	},
] as const;

// -- slight rotations per card create a "scattered stack" effect. uses
// the default Tailwind scale (rotate-1 = 1deg, rotate-2 = 2deg) instead
// of arbitrary `rotate-[1.5deg]` — the half-degree variance was never
// perceptually meaningful at the card size, and the default scale keeps
// the class list inside the theme (no-arbitrary-classname).
const cardTransforms = [
	'rotate-1 -translate-x-2',
	'-rotate-1 translate-x-4',
	'rotate-2 -translate-x-1',
	'-rotate-1 translate-x-6',
	'rotate-1 translate-x-1',
] as const;

/** Maps step variant to Tailwind background color class */
function getStepBgColor(variant: 'green' | 'yellow'): string {
	return variant === 'yellow' ? 'bg-[#F6FF8B]' : 'bg-[#BEFFDB]';
}

/**
 * Section explaining the platform's trust-focused approach.
 *
 * 'use client' required: uses framer-motion for scroll-triggered card animations
 * and SplitText (GSAP) for headline character reveal.
 *
 * @returns Three subsections: trust headline, participation steps, and blockchain footer
 */
export function TrustSection() {
	return (
		<section className="bg-brand-sky lg:rounded-pill-hero relative mt-20 px-6 py-20 lg:mt-0 lg:px-27 lg:py-37.5">
			<div className="max-w-wide relative mx-auto">
				<div className="mb-16">
					<TicketIcon />
				</div>
				<div className="max-w-reading-lg relative mb-8">
					<div className="rounded-pill-2xl bg-brand-mint absolute top-8 -right-4 hidden h-32 w-80.25 -translate-y-1/2 rotate-2 lg:block" />
					<SplitText
						text="Reimagined for trust -"
						className="font-clash-display text-brand-dark tracking-micro-7 lg:text-80 relative z-10 text-4xl/none font-semibold"
						delay={50}
						duration={1.25}
						ease="power3.out"
						splitType="chars"
						from={{ opacity: 0, y: 40 }}
						to={{ opacity: 1, y: 0 }}
						threshold={0.1}
						rootMargin="-100px"
						textAlign="center"
					/>
					<SplitText
						text="not guesswork"
						className="font-clash-display text-brand-dark tracking-micro-7 lg:text-80 relative z-10 text-4xl/none font-semibold"
						delay={50}
						duration={1.25}
						ease="power3.out"
						splitType="chars"
						from={{ opacity: 0, y: 40 }}
						to={{ opacity: 1, y: 0 }}
						threshold={0.1}
						rootMargin="-100px"
						textAlign="center"
					/>
				</div>
				<p className="max-w-docs text-lg/relaxed font-medium text-black lg:text-2xl">
					Traditional sweepstakes often leave users wondering what&apos;s
					happening behind the scenes.
					<br />
					We built Rafli to make every step visible - from who&apos;s hosting
					the sweepstakes to how winners are selected.
				</p>
			</div>

			<div className="max-w-wide relative mx-auto px-6 py-20 lg:px-27 lg:py-37.5">
				<h2 className="font-clash-display text-brand-dark tracking-micro-6 lg:text-60 mb-12 text-center text-4xl/none font-semibold lg:mb-16">
					How would you like to participate?
				</h2>
				<div className="max-w-body mx-auto flex flex-col gap-4">
					{steps.map((step, index) => {
						const bgColor = getStepBgColor(step.variant);
						const transform = cardTransforms[index] ?? '';

						return (
							<motion.div
								key={step.number}
								className={`rounded-pill-2xl flex items-center gap-4 border-2 border-black ${bgColor} px-6 py-8 lg:px-8 ${transform}`}
								initial={{ opacity: 0, y: 40 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, amount: 0.4 }}
								transition={{
									duration: 0.6,
									delay: index * 0.12,
									ease: 'easeOut',
								}}
							>
								<div className="flex size-17.5 shrink-0 items-center justify-center rounded-full border-2 border-black">
									<span className="font-clash-display text-3xl font-bold text-black">
										{step.number}
									</span>
								</div>
								<p className="lg:text-headline-md/none text-xl font-medium text-black">
									{step.text}
								</p>
							</motion.div>
						);
					})}
				</div>
			</div>

			<div className="max-w-wide mx-auto px-6 lg:px-27">
				<div className="mb-4">
					<ShieldCheck className="size-16" />
				</div>
				<p className="max-w-prose text-lg/relaxed font-medium text-black lg:text-2xl">
					Every sweepstakes follows clear rules and transparent draw mechanics,
					supported by blockchain technology!
				</p>
			</div>
		</section>
	);
}
