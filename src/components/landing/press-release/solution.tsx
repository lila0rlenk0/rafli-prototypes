import {
	ScrollReveal,
	ScrollRevealStagger,
} from '@/components/ui-custom/scroll-reveal';
import {
	FeatureCard,
	SectionLabel,
	StepItem,
} from '@/components/landing/press-release/section-primitives';

/**
 * Solution half of the article — the four-pillar feature grid and the
 * five-step how-it-works ladder. Isolated so layout changes to either
 * structured block stay local.
 */
export function PressArticleSolution() {
	return (
		<>
			<ScrollReveal>
				<section className="mb-17.5">
					<SectionLabel>The Solution</SectionLabel>
					<h2 className="font-clash-display text-foreground text-display-fluid-lg/headline tracking-display-mid mb-5.5 font-extrabold">
						How Rafli Reimagines Trust
					</h2>
					<p className="text-foreground/80 mb-4.5 font-light">
						Rafli isn&apos;t just another giveaway tool. It&apos;s a fully
						architected trust layer for the sweepstakes economy, built on three
						pillars:{' '}
						<strong className="text-foreground font-medium">
							verified hosts, transparent rules, and on-chain winner selection.
						</strong>
					</p>

					<ScrollRevealStagger
						className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2"
						stagger={0.1}
					>
						<FeatureCard
							num="01"
							title="Host Verification"
							description="Every sweepstakes host completes a quick but meaningful identity verification step before going live. No more anonymous draws."
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

			<hr className="from-brand-mint via-brand-yellow my-15 h-0.5 border-none bg-linear-to-r to-transparent" />

			<ScrollReveal>
				<section className="mb-17.5">
					<SectionLabel>How It Works</SectionLabel>
					<h2 className="font-clash-display text-foreground text-display-fluid-lg/headline tracking-display-mid mb-5.5 font-extrabold">
						Five Steps from Sign-Up to Winner
					</h2>
					<p className="text-foreground/80 mb-4.5 font-light">
						Rafli distills the entire sweepstakes lifecycle into a clean,
						intuitive flow that works equally well whether you&apos;re a
						participant hunting for prizes or a creator building a draw for your
						audience.
					</p>

					<ScrollRevealStagger
						className="mt-7.5 flex flex-col gap-4.5"
						stagger={0.1}
					>
						<StepItem number={1}>
							<strong className="text-foreground font-medium">
								Browse or host.
							</strong>{' '}
							Explore active sweepstakes across categories — tech gadgets,
							collectibles, digital items, art, accessories, and more — or
							decide to host your own.
						</StepItem>
						<StepItem number={2}>
							<strong className="text-foreground font-medium">
								Host verification.
							</strong>{' '}
							Prospective hosts complete a quick verification step that confirms
							their identity, building instant credibility with participants.
						</StepItem>
						<StepItem number={3}>
							<strong className="text-foreground font-medium">
								Clear rules, upfront.
							</strong>{' '}
							Before a single entry is submitted, all prize details and
							sweepstakes rules are published and locked.
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
							The outcome is recorded on-chain and visible to all, providing a
							permanent, tamper-proof record.
						</StepItem>
					</ScrollRevealStagger>
				</section>
			</ScrollReveal>
		</>
	);
}
