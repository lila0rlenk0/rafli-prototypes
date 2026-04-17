import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ComponentProps } from 'react';

import { CheckmarkIcon, DiamondIcon } from '@/components/landing/shared-icons';
import { Button } from '@/components/ui/button';

// GSAP-dependent — dynamic import avoids loading the full GSAP bundle upfront
const SplitText = dynamic(
	() => import('@/components/ui/animations/split-text'),
);

/**
 * Section for hosts with benefits list and CTA to become a host.
 *
 * Server Component — no hooks or browser APIs. SplitText is dynamically imported
 * (lazy-loaded) to avoid loading the full GSAP bundle upfront.
 *
 * @returns Host section with benefits list, decorative shapes, and CTA button
 */
export function HostSection() {
	/** Host onboarding steps — displayed as a checkmark list */
	const benefits = [
		'Get verified in a few minutes',
		'Set your prize and rules',
		'Launch your raffle',
		'Share it with your audience',
	];

	return (
		<section
			id="hosts"
			className="mx-auto max-w-[1720px] overflow-hidden px-6 py-10 lg:px-[108px] lg:py-20"
		>
			{/* Wrapper to allow decorative elements to overflow */}
			<div className="relative">
				{/* Decorative background shapes - positioned outside the card */}
				<div className="pointer-events-none absolute -right-10 bottom-32 z-10 hidden lg:block">
					<div className="relative h-[600px] w-[500px]">
						<div className="absolute top-[100px] right-0 h-[532px] w-[532px] rotate-[27.845deg] rounded-3xl bg-[#e9f27a]" />
						<div className="absolute top-0 right-[50px] h-[600px] w-[600px] rotate-[15.483deg] rounded-3xl bg-[#f9ffab]">
							<div className="flex h-full w-full items-center justify-center">
								<FlagIcon />
							</div>
						</div>
					</div>
				</div>

				{/* Main card container */}
				<div className="bg-background relative rounded-[60px] border-2 border-black px-8 py-12 lg:rounded-[120px] lg:px-20 lg:py-24">
					{/* Grid layout: left side content, right side decorative */}
					<div className="grid lg:grid-cols-2">
						{/* Left side - Content */}
						<div className="relative">
							<p className="mb-4 text-lg font-bold text-black lg:text-2xl">
								BECOME A RAFFLE HOST!
							</p>
							<SplitText
								text="Run Your Own Raffle Without Headache"
								className="font-clash-display text-dark mb-10 text-4xl leading-none font-semibold tracking-[0.8px] lg:text-[72px]"
								delay={50}
								duration={1.25}
								ease="power3.out"
								splitType="chars"
								from={{ opacity: 0, y: 40 }}
								to={{ opacity: 1, y: 0 }}
								threshold={0.1}
								textAlign="left"
							/>
							<ul className="mb-10 space-y-4">
								{benefits.map(benefit => (
									<li
										key={benefit}
										className="flex items-center gap-3 text-lg font-medium text-black lg:text-2xl"
									>
										<CheckmarkIcon />
										<span>{benefit}</span>
									</li>
								))}
							</ul>
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

						{/* Right side - Diamond icon (visible on mobile, hidden positioning on desktop) */}
						<div className="relative hidden lg:flex lg:items-end lg:justify-end">
							<div className="absolute right-0 bottom-0">
								<DiamondIcon />
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

/**
 * Decorative checkmark icon for host section
 */
function FlagIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="190"
			height="165"
			viewBox="0 0 190 165"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M188.904 3.13972C187.632 1.18193 185.442 -0.000899702 183.092 5.41083e-07L114.004 8.16932e-07C111.296 0.0010511 108.838 1.56971 107.717 4.01234L100.135 20.532L6.91836 20.532C1.60004 20.5325 -1.72342 26.2362 0.936269 30.7986C1.18284 31.2215 1.47433 31.6171 1.80595 31.9786L32.1267 65.018L1.80595 98.0574C-1.77068 101.957 0.254933 108.229 5.45194 109.348C5.93373 109.452 6.42536 109.504 6.91836 109.504L70.0386 109.504C72.7469 109.503 75.2049 107.934 76.3255 105.492L83.9079 88.972L137.822 88.972L107.717 154.58C105.388 159.316 109.107 164.775 114.412 164.405C117.006 164.225 119.278 162.616 120.291 160.244L189.379 9.67571C190.352 7.55866 190.173 5.09682 188.904 3.13972ZM32.9881 19.1995C32.4352 19.2639 31.8973 19.4261 31.3971 19.6768C30.7309 20.0107 30.1493 20.4928 29.7032 21.0899L29.6985 21.0993L15.3329 40.2519C14.7167 41.0732 14.3801 42.0703 14.3736 43.097C14.3691 43.8675 14.5507 44.6259 14.8977 45.3056L15.3001 45.9561L15.3095 45.9701L53.596 98.6129L53.6101 98.6316C54.0538 99.2481 54.6374 99.7498 55.3134 100.096C55.9896 100.443 56.7387 100.625 57.4986 100.625C58.2583 100.625 59.0078 100.443 59.6839 100.096C60.3597 99.7497 60.9436 99.2481 61.3872 98.6316L61.4012 98.6129L99.6877 45.9701L99.6971 45.9561C100.305 45.1272 100.629 44.1246 100.624 43.097C100.618 42.0697 100.281 41.0692 99.6643 40.2472L85.294 21.0852C84.8477 20.4901 84.2655 20.0048 83.6001 19.6721C82.9351 19.3398 82.2004 19.1667 81.4569 19.1667H33.5403L32.9881 19.1995Z"
				fill="black"
			/>
		</svg>
	);
}
