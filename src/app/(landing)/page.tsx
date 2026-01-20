'use client';

import { CheckIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { HeroSection } from './hero-section';
import { Navbar } from './navbar';
import { TrustSection } from './trust-section';

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
				<div className="pointer-events-none absolute -top-20 -left-20 hidden lg:block">
					<div className="relative h-[600px] w-[500px]">
						<div className="absolute top-[100px] left-0 h-[532px] w-[532px] rotate-[-27.845deg] rounded-3xl bg-[#9ffbc8]" />
						<div className="bg-accent-green absolute top-0 left-[50px] h-[600px] w-[600px] rotate-[-15.483deg] rounded-3xl" />
					</div>
				</div>

				<div className="relative z-10 ml-auto max-w-[800px]">
					<p className="mb-4 text-lg font-bold text-black lg:text-2xl">
						WANT TO PARTICIPATE?
					</p>
					<h2 className="font-clash-display text-dark mb-10 text-4xl leading-none tracking-[0.8px] lg:text-[80px]">
						Join Raffles With Full Confidence
					</h2>
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
						className="bg-dark hover:bg-dark/90 h-[60px] w-[234px] text-lg"
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
				<div className="pointer-events-none absolute -top-20 -right-20 hidden lg:block">
					<div className="relative h-[700px] w-[600px]">
						<div className="absolute top-[100px] right-0 h-[527px] w-[527px] rotate-[120deg] rounded-3xl bg-[#e9f27a]" />
						<div className="bg-accent-yellow absolute top-[50px] right-[30px] h-[587px] w-[587px] rotate-[102.816deg] rounded-3xl" />
					</div>
				</div>

				<div className="relative z-10 max-w-[851px]">
					<p className="mb-4 text-lg font-bold text-black lg:text-2xl">
						BECOME A RAFFLE HOST!
					</p>
					<h2 className="font-clash-display text-dark mb-10 text-4xl leading-none tracking-[0.8px] lg:text-[80px]">
						Run Your Own Raffle Without Headache
					</h2>
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
						className="h-[60px] w-[238px] border-2 border-black text-lg text-black/95 hover:bg-black/5"
					>
						<Link href="/sign-up">Become a host</Link>
					</Button>
				</div>

				{/* Decorative icon */}
				<div className="absolute right-40 bottom-20 hidden lg:block">
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
			<h2 className="font-clash-display text-dark mb-6 text-4xl leading-none lg:text-[80px]">
				Something new every day.
			</h2>
			<p className="mx-auto mb-10 max-w-[1000px] text-lg font-medium text-black lg:text-2xl">
				Tech gadgets, collectibles, digital items, art, accessories, experiences
				— you never know what&apos;s coming next.
			</p>
			<Button
				asChild
				className="bg-dark hover:bg-dark/90 h-[60px] w-[234px] text-lg"
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
					<div className="bg-accent-yellow absolute top-0 left-0 h-[364px] w-[364px] rotate-[210deg] rounded-3xl" />
					<div className="bg-accent-green absolute top-[50px] left-[100px] h-[455px] w-[455px] rotate-[265.5deg] rounded-3xl" />
					<div className="bg-accent-blue absolute top-[150px] left-[200px] h-[364px] w-[364px] rotate-[255deg] rounded-3xl" />
				</div>
			</div>
			<div className="pointer-events-none absolute -right-40 -bottom-40 hidden lg:block">
				<div className="relative h-[400px] w-[400px]">
					<div className="bg-accent-yellow absolute top-0 right-0 h-[210px] w-[210px] rotate-[150deg] rounded-3xl" />
					<div className="bg-accent-green absolute top-[50px] right-[50px] h-[186px] w-[186px] rotate-[205.5deg] rounded-3xl" />
					<div className="bg-accent-blue absolute top-[100px] right-[100px] h-[210px] w-[210px] rotate-[195deg] rounded-3xl" />
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
				<p className="text-lg leading-8 font-medium tracking-wide text-[#7b7b7b]">
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
		<div className="bg-background min-h-screen">
			<Navbar />
			<main>
				<HeroSection />
				<TrustSection />
				<ParticipantSection />
				<HostSection />
				<CTASection />
			</main>
			<Footer />
		</div>
	);
}
