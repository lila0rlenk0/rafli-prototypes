import SplitText from '@/components/ui/animations/split-text';
import { Button } from '@/components/ui/button';
import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { ComponentProps } from 'react';

/**
 * Section for hosts with benefits list
 */
export function HostSection() {
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
								<Link href="/sign-up">Become a host</Link>
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
				d="M188.904 3.13972C187.632 1.18193 185.442 -0.000899702 183.092 5.41083e-07L114.004 8.16932e-07C111.296 0.0010511 108.838 1.56971 107.717 4.01234L100.135 20.532L6.91836 20.532C1.60004 20.5325 -1.72342 26.2362 0.936269 30.7986C1.18284 31.2215 1.47433 31.6171 1.80595 31.9786L32.1267 65.018L1.80595 98.0574C-1.77068 101.957 0.254933 108.229 5.45194 109.348C5.93373 109.452 6.42536 109.504 6.91836 109.504L70.0386 109.504C72.7469 109.503 75.2049 107.934 76.3255 105.492L83.9079 88.972L137.822 88.972L107.717 154.58C105.388 159.316 109.107 164.775 114.412 164.405C117.006 164.225 119.278 162.616 120.291 160.244L189.379 9.67571C190.352 7.55866 190.173 5.09682 188.904 3.13972ZM65.591 95.8159L22.5322 95.8159L46.5746 69.6206C48.9688 67.0105 48.9688 63.0255 46.5746 60.4154L22.5322 34.22L93.8564 34.22L65.591 95.8159ZM144.1 75.284L90.1862 75.284L118.452 13.688L172.366 13.688L144.1 75.284Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Decorative diamond icon for host section
 */
function DiamondIcon() {
	return (
		<svg
			width="201"
			height="201"
			viewBox="0 0 201 201"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-32 w-32 lg:h-[201px] lg:w-[201px]"
		>
			<path
				d="M100.5 0L150.75 50.25L100.5 100.5L50.25 50.25L100.5 0Z"
				fill="black"
			/>
			<path
				d="M100.5 100.5L150.75 150.75L100.5 201L50.25 150.75L100.5 100.5Z"
				fill="black"
			/>
			<path
				d="M0 100.5L50.25 50.25L100.5 100.5L50.25 150.75L0 100.5Z"
				fill="black"
			/>
			<path
				d="M100.5 100.5L150.75 50.25L201 100.5L150.75 150.75L100.5 100.5Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Checkmark icon for feature lists
 */
function CheckmarkIcon() {
	return (
		<div className="flex h-6 w-6 shrink-0 items-center justify-center">
			<CheckIcon className="h-5 w-5 text-black" strokeWidth={3} />
		</div>
	);
}
