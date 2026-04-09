// 'use client' required: ScrollReveal and ScrollRevealStagger use
// IntersectionObserver and framer-motion for scroll-triggered animations.
'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import {
	ScrollReveal,
	ScrollRevealStagger,
} from '@/components/ui/scroll-reveal';

import { Footer } from '../footer';
import { Navbar } from '../navbar';

/**
 * Section label — green uppercase badge above section headings.
 * @returns Styled label div
 */
function SectionLabel({ children }: { children: ReactNode }) {
	return (
		<div className="font-clash-display mb-3.5 text-xs font-bold tracking-[0.15em] text-[#00c853] uppercase">
			{children}
		</div>
	);
}

interface PullQuoteProps {
	quote: string;
	attribution: string;
}

/**
 * Pull quote block with decorative quotation mark on dark background.
 * @returns Styled blockquote with attribution
 */
function PullQuote({ quote, attribution }: PullQuoteProps) {
	return (
		<div className="bg-dark relative my-12 overflow-hidden rounded-2xl px-11 py-9">
			<span className="font-clash-display text-accent-green/15 pointer-events-none absolute -top-5 left-7 text-[160px] leading-none select-none">
				&ldquo;
			</span>
			<p className="font-clash-display relative z-10 text-[clamp(18px,2.5vw,26px)] leading-[1.4] font-bold tracking-[-0.5px] text-white">
				{quote}
			</p>
			<span className="text-accent-green mt-3.5 block text-[13px] font-light">
				{attribution}
			</span>
		</div>
	);
}

type FeatureColor = 'sky' | 'yellow' | 'green' | 'gray';

interface FeatureCardProps {
	num: string;
	title: string;
	description: string;
	color: FeatureColor;
}

/**
 * Feature card with numbered heading and colored background.
 * @returns Styled card with number badge, title, and description
 */
function FeatureCard({ num, title, description, color }: FeatureCardProps) {
	/** Maps semantic color name to Tailwind bg class — exhaustive switch over FeatureColor union */
	function getColorClass(): string {
		switch (color) {
			case 'sky':
				return 'bg-accent-blue';
			case 'yellow':
				return 'bg-accent-yellow';
			case 'green':
				return 'bg-accent-green';
			case 'gray':
				return 'bg-neutral-100';
		}
	}

	return (
		<div className={`rounded-2xl px-7 py-7.5 ${getColorClass()}`}>
			<div className="font-clash-display mb-2.5 text-[13px] font-bold tracking-[0.05em] text-black/30">
				{num}
			</div>
			<h4 className="font-clash-display mb-2 text-lg font-bold tracking-[-0.3px]">
				{title}
			</h4>
			<p className="text-sm leading-relaxed text-black/60">{description}</p>
		</div>
	);
}

interface StepItemProps {
	number: number;
	children: ReactNode;
}

/**
 * Numbered step item with badge — used in the "How It Works" section.
 * @returns Row with number badge and step description
 */
function StepItem({ number, children }: StepItemProps) {
	return (
		<div className="flex items-start gap-4.5 rounded-xl bg-neutral-100 px-5 py-4.5">
			<div className="bg-dark text-accent-green font-clash-display grid size-[34px] shrink-0 place-items-center rounded-xl text-[15px] font-extrabold">
				{number}
			</div>
			<p className="text-foreground/80 text-[15px]">{children}</p>
		</div>
	);
}

/** Press release image paths in display order */
const PRESS_IMAGES = {
	banner: '/press/banner.png',
	raffleList: '/press/raffle-list.png',
	raffleDetails: '/press/raffle-details.png',
	footer: '/press/footer.png',
} as const;

/**
 * Press Release page — static blog-style article introducing Rafli.
 *
 * Follows the landing page pattern with its own Navbar (decoration disabled)
 * and Footer. Client component required for ScrollReveal/GSAP animations.
 *
 * Sections: Hero > Overview > Problem > Quote > Solution > How It Works >
 * For Participants > For Hosts > Quote > Looking Ahead > Press Contact.
 *
 * @returns Full press release article page
 */
export default function PressReleasePage() {
	return (
		<div className="min-h-screen bg-[#f9f8f4]">
			<Navbar showDecoration={false} />
			<main>
				{/* Hero */}
				<section className="bg-background relative overflow-hidden px-6 pt-16 pb-24 sm:px-10">
					{/* Decorative shapes */}
					<div className="absolute -top-15 -right-15 size-[340px] rotate-[18deg] rounded-[30px] bg-[#9ffbc8]" />
					<div className="absolute -bottom-10 left-15 size-[200px] -rotate-12 rounded-[20px] bg-[#e9f27a]" />

					<ScrollReveal>
						<div className="font-clash-display mb-5 text-xs font-semibold tracking-[0.15em] text-[#00c853] uppercase">
							Introducing Rafli
						</div>
						<h1 className="font-clash-display text-foreground mb-7 max-w-[780px] text-[clamp(42px,7vw,80px)] leading-[1.05] font-extrabold tracking-[-2px]">
							Raffles.
							<br />
							<span className="text-[#00c853]">Done right.</span>
						</h1>
						<p className="text-foreground/55 max-w-[540px] text-lg leading-[1.7] font-light">
							A new blockchain-backed platform is redefining transparency,
							trust, and excitement in the world of online raffles — for hosts
							and participants alike.
						</p>
					</ScrollReveal>
				</section>

				{/* Article Body */}
				<div className="mx-auto max-w-[820px] px-6 py-20 sm:px-10">
					{/* Overview */}
					<ScrollReveal>
						<section className="mb-[70px]">
							<SectionLabel>Overview</SectionLabel>
							<h2 className="font-clash-display text-foreground mb-5.5 text-[clamp(28px,4vw,42px)] leading-[1.1] font-extrabold tracking-[-1.5px]">
								The Raffle Revolution Nobody Knew Was Coming
							</h2>
							<p className="text-foreground/80 mb-4.5 font-light">
								Every day, thousands of people enter online raffles — and every
								day, thousands of them wonder the same thing:{' '}
								<strong className="text-foreground font-medium">
									was that draw actually fair?
								</strong>{' '}
								With no way to verify the host&apos;s identity, no visibility
								into how winners are selected, and no recourse if something
								feels off, traditional online raffles have long suffered from a
								trust problem.
							</p>
							<p className="text-foreground/80 mb-4.5 font-light">
								Enter{' '}
								<strong className="text-foreground font-medium">Rafli</strong> —
								a platform designed from the ground up to make every step of a
								raffle visible, verifiable, and fair. From the moment a host
								creates a draw to the moment a winner is announced, Rafli puts
								transparency at the center of the experience.
							</p>
							<Image
								src={PRESS_IMAGES.banner}
								alt="Rafli banner"
								width={1600}
								height={500}
								className="mt-8 w-full rounded-2xl"
							/>
						</section>
					</ScrollReveal>

					{/* The Problem */}
					<ScrollReveal>
						<section className="mb-[70px]">
							<SectionLabel>The Problem</SectionLabel>
							<h2 className="font-clash-display text-foreground mb-5.5 text-[clamp(28px,4vw,42px)] leading-[1.1] font-extrabold tracking-[-1.5px]">
								Why Traditional Raffles Have a Trust Crisis
							</h2>
							<p className="text-foreground/80 mb-4.5 font-light">
								The raffle industry — spanning physical events, social media
								giveaways, and dedicated platforms — generates billions in
								participation every year. Yet the infrastructure underpinning
								most of these draws remains surprisingly opaque.{' '}
								<strong className="text-foreground font-medium">
									Who is the host? How are winners chosen? Can results be
									manipulated?
								</strong>{' '}
								These aren&apos;t fringe concerns; they&apos;re the lived
								experience of millions of participants.
							</p>
							<p className="text-foreground/80 mb-4.5 font-light">
								Rafli&apos;s founders identified three core failure points in
								the legacy model: unverified hosts who could be anonymous bad
								actors, draw mechanisms that offer no auditability, and prize
								rules that can shift without notice. The result is an industry
								ripe for a transparency-first reinvention.
							</p>
						</section>
					</ScrollReveal>

					{/* Pull Quote 1 */}
					<ScrollReveal>
						<PullQuote
							quote="We built Rafli to make every step visible — from who's hosting the raffle to how winners are selected."
							attribution="— Rafli founding team"
						/>
					</ScrollReveal>

					{/* The Solution */}
					<ScrollReveal>
						<section className="mb-[70px]">
							<SectionLabel>The Solution</SectionLabel>
							<h2 className="font-clash-display text-foreground mb-5.5 text-[clamp(28px,4vw,42px)] leading-[1.1] font-extrabold tracking-[-1.5px]">
								How Rafli Reimagines Trust
							</h2>
							<p className="text-foreground/80 mb-4.5 font-light">
								Rafli isn&apos;t just another giveaway tool. It&apos;s a fully
								architected trust layer for the raffle economy, built on three
								pillars:{' '}
								<strong className="text-foreground font-medium">
									verified hosts, transparent rules, and on-chain winner
									selection.
								</strong>
							</p>

							<ScrollRevealStagger
								className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2"
								stagger={0.1}
							>
								<FeatureCard
									num="01"
									title="Host Verification"
									description="Every raffle host completes a quick but meaningful identity verification step before going live. No more anonymous draws."
									color="sky"
								/>
								<FeatureCard
									num="02"
									title="Transparent Rules"
									description="Prize details, entry rules, and draw mechanics are locked in and publicly visible before anyone spends a cent or a minute."
									color="yellow"
								/>
								<FeatureCard
									num="03"
									title="On-Chain Selection"
									description="Winners are selected using verifiable randomness and recorded on the blockchain — auditable by anyone, forever."
									color="green"
								/>
								<FeatureCard
									num="04"
									title="End-to-End Tracking"
									description="Participants can track progress from entry to announcement. No black boxes, no vague timelines."
									color="gray"
								/>
							</ScrollRevealStagger>
						</section>
					</ScrollReveal>

					{/* Divider */}
					<hr className="from-accent-green via-accent-yellow my-15 h-0.5 border-none bg-gradient-to-r to-transparent" />

					{/* How It Works */}
					<ScrollReveal>
						<section className="mb-[70px]">
							<SectionLabel>How It Works</SectionLabel>
							<h2 className="font-clash-display text-foreground mb-5.5 text-[clamp(28px,4vw,42px)] leading-[1.1] font-extrabold tracking-[-1.5px]">
								Five Steps from Sign-Up to Winner
							</h2>
							<p className="text-foreground/80 mb-4.5 font-light">
								Rafli distills the entire raffle lifecycle into a clean,
								intuitive flow that works equally well whether you&apos;re a
								participant hunting for prizes or a creator building a draw for
								your audience.
							</p>

							<ScrollRevealStagger
								className="mt-7.5 flex flex-col gap-4.5"
								stagger={0.1}
							>
								<StepItem number={1}>
									<strong className="text-foreground font-medium">
										Browse or host.
									</strong>{' '}
									Explore active raffles across categories — tech gadgets,
									collectibles, digital items, art, accessories, and more — or
									decide to host your own.
								</StepItem>
								<StepItem number={2}>
									<strong className="text-foreground font-medium">
										Host verification.
									</strong>{' '}
									Prospective hosts complete a quick verification step that
									confirms their identity, building instant credibility with
									participants.
								</StepItem>
								<StepItem number={3}>
									<strong className="text-foreground font-medium">
										Clear rules, upfront.
									</strong>{' '}
									Before a single entry is submitted, all prize details and
									raffle rules are published and locked.
								</StepItem>
								<StepItem number={4}>
									<strong className="text-foreground font-medium">
										Transparent draw.
									</strong>{' '}
									Winner selection happens via verifiable randomness — no human
									intervention, no manipulation.
								</StepItem>
								<StepItem number={5}>
									<strong className="text-foreground font-medium">
										On-chain results.
									</strong>{' '}
									The outcome is recorded on-chain and visible to all, providing
									a permanent, tamper-proof record.
								</StepItem>
							</ScrollRevealStagger>
						</section>
					</ScrollReveal>

					{/* For Participants */}
					<ScrollReveal>
						<section className="mb-[70px]">
							<SectionLabel>For Participants</SectionLabel>
							<h2 className="font-clash-display text-foreground mb-5.5 text-[clamp(28px,4vw,42px)] leading-[1.1] font-extrabold tracking-[-1.5px]">
								Join Raffles With Full Confidence
							</h2>
							<p className="text-foreground/80 mb-4.5 font-light">
								For the millions of people who love the thrill of a good raffle,
								Rafli delivers something the market has never reliably offered:{' '}
								<strong className="text-foreground font-medium">
									peace of mind.
								</strong>{' '}
								When you enter a Rafli draw, you know exactly what you&apos;re
								getting — a fair shot at a real prize, with a host who has been
								verified and rules that can&apos;t be changed mid-game.
							</p>
							<p className="text-foreground/80 mb-4.5 font-light">
								The platform spans an expansive and ever-refreshing catalogue of
								prizes. Tech gadgets, limited-edition collectibles, digital
								items, fashion accessories, experiences — something new surfaces
								every single day. For collectors, enthusiasts, and deal-seekers
								alike, Rafli offers a legitimate and exciting new discovery
								channel.
							</p>
							<Image
								src={PRESS_IMAGES.raffleList}
								alt="Raffle listings on Rafli"
								width={1600}
								height={500}
								className="mt-8 w-full rounded-2xl"
							/>
						</section>
					</ScrollReveal>

					{/* For Hosts */}
					<ScrollReveal>
						<section className="mb-[70px]">
							<SectionLabel>For Hosts</SectionLabel>
							<h2 className="font-clash-display text-foreground mb-5.5 text-[clamp(28px,4vw,42px)] leading-[1.1] font-extrabold tracking-[-1.5px]">
								Run Your Own Raffle Without the Headache
							</h2>
							<p className="text-foreground/80 mb-4.5 font-light">
								With Rafli, a host can go from idea to live raffle in just a few
								steps:{' '}
								<strong className="text-foreground font-medium">
									get verified, set your prize and rules, launch, and share.
								</strong>{' '}
								The platform handles the mechanics — the draw, the
								record-keeping, the winner communication — so hosts can focus on
								what actually matters: building excitement around their
								offering.
							</p>
							<p className="text-foreground/80 mb-4.5 font-light">
								Because every draw on Rafli carries the platform&apos;s trust
								infrastructure, hosts benefit from immediate credibility, even
								if their audience has never heard of them before.
							</p>
							<Image
								src={PRESS_IMAGES.raffleDetails}
								alt="Rafli raffle details page"
								width={1600}
								height={900}
								className="mt-8 w-full rounded-2xl"
							/>
						</section>
					</ScrollReveal>

					{/* Pull Quote 2 */}
					<ScrollReveal>
						<PullQuote
							quote="Something new every day. Tech gadgets, collectibles, digital items, art, accessories, experiences — you never know what's coming next."
							attribution="— Rafli platform promise"
						/>
					</ScrollReveal>

					{/* Looking Ahead */}
					<ScrollReveal>
						<section className="mb-[70px]">
							<SectionLabel>Looking Ahead</SectionLabel>
							<h2 className="font-clash-display text-foreground mb-5.5 text-[clamp(28px,4vw,42px)] leading-[1.1] font-extrabold tracking-[-1.5px]">
								Fair Raffles. Real Prizes. No Funny Business.
							</h2>
							<p className="text-foreground/80 mb-4.5 font-light">
								Rafli&apos;s tagline is deliberately blunt — and that&apos;s the
								point. In a space where vague promises and anonymous operators
								have eroded trust, Rafli is betting that radical transparency is
								not just a differentiator but a necessity.
							</p>
							<p className="text-foreground/80 mb-4.5 font-light">
								By making verification, rule-locking, and on-chain winner
								selection the default — not a premium feature — Rafli is setting
								a new standard for what a raffle platform should be. For
								participants tired of wondering if the game is rigged, and for
								hosts who want their audience to take them seriously,{' '}
								<strong className="text-foreground font-medium">
									Rafli is the answer.
								</strong>
							</p>
							<Image
								src={PRESS_IMAGES.footer}
								alt="Rafli prizes and items illustration"
								width={1600}
								height={500}
								className="mt-8 w-full rounded-2xl"
							/>
						</section>
					</ScrollReveal>

					{/* Press Contact */}
					<ScrollReveal>
						<section className="rounded-2xl bg-neutral-100 px-6 py-9 sm:px-10">
							<SectionLabel>Press Contact</SectionLabel>
							<h3 className="font-clash-display text-foreground mb-3.5 text-[22px] font-bold tracking-[-0.5px]">
								Media Inquiries
							</h3>
							<p className="text-foreground/80 mb-4.5 font-light">
								For interviews, demos, press assets, or additional information
								about Rafli, please reach out to the team directly.
							</p>
							<p className="text-foreground/80 font-light">
								<strong className="text-foreground font-medium">
									Website:
								</strong>{' '}
								[Insert URL]
								<br />
								<strong className="text-foreground font-medium">
									Email:
								</strong>{' '}
								[Insert press contact email]
								<br />
								<strong className="text-foreground font-medium">
									Social:
								</strong>{' '}
								[Insert handles]
							</p>
							<p className="mt-2.5 text-[13px] text-neutral-400">
								Rafli is a subsidiary of EARN&apos;M Foundation. © 2026 Rafli —
								All rights reserved.
							</p>
						</section>
					</ScrollReveal>
				</div>
			</main>
			<Footer />
		</div>
	);
}
