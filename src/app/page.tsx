import { CheckIcon } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/assets/logo';
import { Button } from '@/components/ui/button';

/**
 * Navigation bar component for the landing page
 */
function Navbar() {
	return (
		<nav className="w-full border-b border-[#e6e8ec]">
			<div className="mx-auto flex max-w-[1720px] items-center justify-between px-6 py-5 lg:px-[100px]">
				<div className="flex items-center gap-8 lg:gap-[60px]">
					<Link href="/" aria-label="Home">
						<Logo className="h-5 w-auto" />
					</Link>
					<div className="hidden items-center gap-8 text-base font-bold md:flex">
						<Link href="#participants" className="text-black hover:opacity-80">
							For Participants
						</Link>
						<Link
							href="#hosts"
							className="text-[#121211] hover:opacity-80"
						>
							For Hosts
						</Link>
					</div>
				</div>
				<Button asChild className="h-12 bg-dark px-6 text-base hover:bg-dark/90">
					<Link href="/sign-in">Enter the App</Link>
				</Button>
			</div>
		</nav>
	);
}

/**
 * Hero section with main headline and call-to-action buttons
 */
function HeroSection() {
	return (
		<section className="relative mx-auto max-w-[1720px] px-6 pb-20 pt-16 lg:px-[108px] lg:pt-[100px]">
			{/* Decorative shapes - top right */}
			<div className="pointer-events-none absolute right-0 top-0 hidden overflow-hidden lg:block">
				<div className="relative h-[600px] w-[700px]">
					<div className="absolute -top-[100px] right-[100px] h-[513px] w-[513px] rotate-[-30deg] rounded-3xl bg-accent-yellow" />
					<div className="absolute right-[50px] top-[100px] h-[641px] w-[641px] rotate-[25.5deg] rounded-3xl bg-accent-green" />
					<div className="absolute right-[200px] top-[200px] h-[513px] w-[513px] rotate-[15deg] rounded-3xl bg-accent-blue" />
				</div>
			</div>

			<div className="relative z-10">
				<p className="mb-4 text-center text-xl font-medium text-black lg:text-left lg:text-2xl">
					Fair Raffles • Real Prizes • No Funny Business
				</p>
				<h1 className="mb-6 font-clash-display text-6xl leading-none text-dark lg:text-[160px]">
					Raffles!
					<br />
					Done right!
				</h1>
				<p className="mb-10 max-w-[1131px] text-xl font-medium text-black lg:text-2xl">
					Become verified hosts to run prize draws or join any raffle to win a
					prize!
				</p>
				<div className="flex flex-wrap items-center gap-4 lg:gap-[34px]">
					<Button
						asChild
						className="h-[60px] w-[234px] bg-dark text-lg hover:bg-dark/90"
					>
						<Link href="/browse">Explore raffles</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						className="h-[60px] w-[238px] border-2 border-black text-lg text-black/95 hover:bg-black/5"
					>
						<Link href="/sign-up">Become a host</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

/**
 * Decorative icon for the "Reimagined for trust" section
 */
function TrustIcon() {
	return (
		<svg
			width="104"
			height="74"
			viewBox="0 0 104 74"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M52 0L104 37L52 74L0 37L52 0Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Section explaining the platform's trust-focused approach
 */
function TrustSection() {
	return (
		<section className="relative mt-20 bg-accent-blue px-6 py-20 lg:mt-0 lg:rounded-[120px] lg:px-[108px] lg:py-[150px]">
			<div className="relative mx-auto max-w-[1720px]">
				<div className="mb-6">
					<TrustIcon />
				</div>
				<div className="relative mb-8 max-w-[885px]">
					<div className="absolute -right-4 top-1/2 hidden h-[128px] w-[321px] -translate-y-1/2 rotate-2 rounded-[30px] bg-accent-green lg:block" />
					<h2 className="relative z-10 font-clash-display text-4xl leading-none tracking-[0.8px] text-dark lg:text-[80px]">
						Reimagined for trust - not guesswork
					</h2>
				</div>
				<p className="max-w-[1168px] text-lg font-medium leading-relaxed text-black lg:text-2xl">
					Traditional raffles often leave users wondering what&apos;s happening
					behind the scenes.
					<br />
					We built Verifair to make every step visible - from who&apos;s hosting
					the raffle to how winners are selected.
				</p>
			</div>
		</section>
	);
}

/**
 * Step card component for the participation flow
 */
function StepCard({
	number,
	text,
	variant = 'green',
}: {
	number: number;
	text: string;
	variant?: 'green' | 'yellow';
}) {
	const bgColor = variant === 'yellow' ? 'bg-accent-yellow' : 'bg-accent-green';

	return (
		<div
			className={`flex items-center gap-4 rounded-[30px] border-2 border-black ${bgColor} px-6 py-8 lg:px-8`}
		>
			<div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full bg-white">
				<span className="font-clash-display text-3xl font-bold text-black">
					{number}
				</span>
			</div>
			<p className="text-xl font-medium text-black lg:text-[32px] lg:leading-none">
				{text}
			</p>
		</div>
	);
}

/**
 * Section showing how users can participate
 */
function ParticipationSection() {
	const steps = [
		{ number: 1, text: 'Browse raffles or decide to host one', variant: 'green' as const },
		{ number: 2, text: 'Hosts complete a quick verification step', variant: 'green' as const },
		{ number: 3, text: 'Join or launch raffles with clear rules', variant: 'green' as const },
		{ number: 4, text: 'Winners are selected transparently', variant: 'green' as const },
		{ number: 5, text: 'Results are visible and trackable on-chain', variant: 'yellow' as const },
	];

	return (
		<section className="relative mx-auto max-w-[1720px] px-6 py-20 lg:px-[108px] lg:py-[150px]">
			<h2 className="mb-12 text-center font-clash-display text-4xl leading-none tracking-[0.6px] text-dark lg:mb-16 lg:text-[60px]">
				How would you like to participate?
			</h2>
			<div className="mx-auto flex max-w-[900px] flex-col gap-4">
				{steps.map((step) => (
					<StepCard
						key={step.number}
						number={step.number}
						text={step.text}
						variant={step.variant}
					/>
				))}
			</div>
		</section>
	);
}

/**
 * Icon component for blockchain/verification
 */
function BlockchainIcon() {
	return (
		<svg
			width="65"
			height="65"
			viewBox="0 0 65 65"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-16 w-16"
		>
			<rect width="65" height="65" rx="8" fill="black" />
			<path
				d="M32.5 15L47 24V40L32.5 50L18 40V24L32.5 15Z"
				stroke="white"
				strokeWidth="2"
			/>
			<path d="M32.5 15V50M18 24L47 40M47 24L18 40" stroke="white" strokeWidth="2" />
		</svg>
	);
}

/**
 * Section about blockchain-powered transparency
 */
function TransparencySection() {
	return (
		<section className="mx-auto max-w-[1720px] px-6 lg:px-[108px]">
			<div className="mb-8">
				<BlockchainIcon />
			</div>
			<p className="max-w-[679px] text-lg font-medium leading-relaxed text-black lg:text-2xl">
				Every raffle follows clear rules and transparent draw mechanics,
				supported by blockchain technology!
			</p>
		</section>
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

/**
 * Decorative diamond icon for participant section
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
 * Decorative checkmark icon for host section
 */
function HostCheckIcon() {
	return (
		<svg
			width="190"
			height="164"
			viewBox="0 0 190 164"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-32 w-32 lg:h-[164px] lg:w-[190px]"
		>
			<path
				d="M70 130L20 80L35 65L70 100L155 15L170 30L70 130Z"
				fill="black"
				stroke="black"
				strokeWidth="8"
			/>
		</svg>
	);
}

/**
 * Section for participants with benefits list
 */
function ParticipantSection() {
	const benefits = [
		'Raffles hosted by verified creators',
		'Winners selected using verifiable randomness',
		'Prize details visible before entry',
		'Track progress from start to finish',
		'Transparent rules for every raffle',
	];

	return (
		<section
			id="participants"
			className="mx-auto max-w-[1720px] px-6 py-10 lg:px-[108px] lg:py-20"
		>
			<div className="relative overflow-hidden rounded-[60px] border-2 border-black px-8 py-12 lg:rounded-[120px] lg:px-20 lg:py-24">
				{/* Decorative background shapes */}
				<div className="pointer-events-none absolute -left-20 -top-20 hidden lg:block">
					<div className="relative h-[600px] w-[500px]">
						<div className="absolute left-0 top-[100px] h-[532px] w-[532px] rotate-[-27.845deg] rounded-3xl bg-[#9ffbc8]" />
						<div className="absolute left-[50px] top-0 h-[600px] w-[600px] rotate-[-15.483deg] rounded-3xl bg-accent-green" />
					</div>
				</div>

				<div className="relative z-10 ml-auto max-w-[800px]">
					<p className="mb-4 text-lg font-bold text-black lg:text-2xl">
						WANT TO PARTICIPATE?
					</p>
					<h2 className="mb-10 font-clash-display text-4xl leading-none tracking-[0.8px] text-dark lg:text-[80px]">
						Join Raffles With Full Confidence
					</h2>
					<ul className="mb-10 space-y-4">
						{benefits.map((benefit) => (
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
						className="h-[60px] w-[234px] bg-dark text-lg hover:bg-dark/90"
					>
						<Link href="/browse">Explore raffles</Link>
					</Button>
				</div>

				{/* Decorative icon */}
				<div className="absolute bottom-20 left-20 hidden lg:block">
					<DiamondIcon />
				</div>
			</div>
		</section>
	);
}

/**
 * Section for hosts with benefits list
 */
function HostSection() {
	const benefits = [
		'Get verified in a few minutes',
		'Set your prize and rules',
		'Launch your raffle',
		'Share it with your audience',
	];

	return (
		<section
			id="hosts"
			className="mx-auto max-w-[1720px] px-6 py-10 lg:px-[108px] lg:py-20"
		>
			<div className="relative overflow-hidden rounded-[60px] border-2 border-black px-8 py-12 lg:rounded-[120px] lg:px-20 lg:py-24">
				{/* Decorative background shapes */}
				<div className="pointer-events-none absolute -right-20 -top-20 hidden lg:block">
					<div className="relative h-[700px] w-[600px]">
						<div className="absolute right-0 top-[100px] h-[527px] w-[527px] rotate-[120deg] rounded-3xl bg-[#e9f27a]" />
						<div className="absolute right-[30px] top-[50px] h-[587px] w-[587px] rotate-[102.816deg] rounded-3xl bg-accent-yellow" />
					</div>
				</div>

				<div className="relative z-10 max-w-[851px]">
					<p className="mb-4 text-lg font-bold text-black lg:text-2xl">
						BECOME A RAFFLE HOST!
					</p>
					<h2 className="mb-10 font-clash-display text-4xl leading-none tracking-[0.8px] text-dark lg:text-[80px]">
						Run Your Own Raffle Without Headache
					</h2>
					<ul className="mb-10 space-y-4">
						{benefits.map((benefit) => (
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
						className="h-[60px] w-[238px] border-2 border-black text-lg text-black/95 hover:bg-black/5"
					>
						<Link href="/sign-up">Become a host</Link>
					</Button>
				</div>

				{/* Decorative icon */}
				<div className="absolute bottom-20 right-40 hidden lg:block">
					<HostCheckIcon />
				</div>
			</div>
		</section>
	);
}

/**
 * Gift/sparkle icon for the CTA section
 */
function GiftIcon() {
	return (
		<svg
			width="115"
			height="115"
			viewBox="0 0 115 115"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-20 w-20 lg:h-[115px] lg:w-[115px]"
		>
			<path
				d="M57.5 0L64.5 42L107 35L72.5 57.5L107 80L64.5 73L57.5 115L50.5 73L8 80L42.5 57.5L8 35L50.5 42L57.5 0Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Call-to-action section with daily raffles message
 */
function CTASection() {
	return (
		<section className="mx-auto max-w-[1720px] px-6 py-20 text-center lg:px-[108px] lg:py-[150px]">
			<div className="mb-8 flex justify-center">
				<GiftIcon />
			</div>
			<h2 className="mb-6 font-clash-display text-4xl leading-none text-dark lg:text-[80px]">
				Something new every day.
			</h2>
			<p className="mx-auto mb-10 max-w-[1000px] text-lg font-medium text-black lg:text-2xl">
				Tech gadgets, collectibles, digital items, art, accessories, experiences
				— you never know what&apos;s coming next.
			</p>
			<Button
				asChild
				className="h-[60px] w-[234px] bg-dark text-lg hover:bg-dark/90"
			>
				<Link href="/browse">Explore raffles</Link>
			</Button>
		</section>
	);
}

/**
 * Footer component with links and copyright
 */
function Footer() {
	return (
		<footer className="relative overflow-hidden px-6 py-20 lg:px-[108px]">
			{/* Decorative background shapes */}
			<div className="pointer-events-none absolute -bottom-40 -left-40 hidden lg:block">
				<div className="relative h-[500px] w-[500px]">
					<div className="absolute left-0 top-0 h-[364px] w-[364px] rotate-[210deg] rounded-3xl bg-accent-yellow" />
					<div className="absolute left-[100px] top-[50px] h-[455px] w-[455px] rotate-[265.5deg] rounded-3xl bg-accent-green" />
					<div className="absolute left-[200px] top-[150px] h-[364px] w-[364px] rotate-[255deg] rounded-3xl bg-accent-blue" />
				</div>
			</div>
			<div className="pointer-events-none absolute -bottom-40 -right-40 hidden lg:block">
				<div className="relative h-[400px] w-[400px]">
					<div className="absolute right-0 top-0 h-[210px] w-[210px] rotate-[150deg] rounded-3xl bg-accent-yellow" />
					<div className="absolute right-[50px] top-[50px] h-[186px] w-[186px] rotate-[205.5deg] rounded-3xl bg-accent-green" />
					<div className="absolute right-[100px] top-[100px] h-[210px] w-[210px] rotate-[195deg] rounded-3xl bg-accent-blue" />
				</div>
			</div>

			<div className="relative z-10 mx-auto max-w-[1720px] text-center">
				<div className="mb-4 flex flex-col items-center gap-2">
					<Link
						href="/support"
						className="text-lg font-medium text-black underline"
					>
						Support
					</Link>
					<Link
						href="/terms"
						className="text-lg font-medium text-black underline"
					>
						Terms of Service
					</Link>
				</div>
				<p className="text-lg font-medium leading-8 tracking-wide text-[#7b7b7b]">
					Verifair is a subsidiary of the EARN&apos;M Foundation
					<br />
					Copyright ©2026 — Verifair, Inc — All rights reserved.
				</p>
			</div>
		</footer>
	);
}

/**
 * Landing page for Raffly - the raffle platform
 *
 * Showcases the platform's features, benefits for participants and hosts,
 * and provides call-to-action buttons to enter the app.
 */
export default function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			<Navbar />
			<main>
				<HeroSection />
				<TrustSection />
				<ParticipationSection />
				<TransparencySection />
				<ParticipantSection />
				<HostSection />
				<CTASection />
			</main>
			<Footer />
		</div>
	);
}
