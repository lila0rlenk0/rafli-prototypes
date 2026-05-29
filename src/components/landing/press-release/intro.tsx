import Image from 'next/image';

import { ScrollReveal } from '@/components/ui-custom/scroll-reveal';
import {
	PRESS_IMAGES,
	PullQuote,
	SectionLabel,
} from '@/components/landing/press-release/section-primitives';

/**
 * Intro half of the article — Overview, Problem, and the first pull
 * quote. Split from the full body so each sub-narrative fits well under
 * the function-length cap and section edits stay local.
 */
export function PressArticleIntro() {
	return (
		<>
			<ScrollReveal>
				<section className="mb-17.5">
					<SectionLabel>Overview</SectionLabel>
					<h2 className="font-clash-display text-foreground text-display-fluid-lg/headline tracking-display-mid mb-5.5 font-extrabold">
						The Sweepstakes Revolution Nobody Knew Was Coming
					</h2>
					<p className="text-foreground/80 mb-4.5 font-light">
						Every day, thousands of people enter online sweepstakes — and every
						day, thousands of them wonder the same thing:{' '}
						<strong className="text-foreground font-medium">
							was that draw actually fair?
						</strong>{' '}
						With no way to verify the host&apos;s identity, no visibility into
						how winners are selected, and no recourse if something feels off,
						traditional online sweepstakes have long suffered from a trust
						problem.
					</p>
					<p className="text-foreground/80 mb-4.5 font-light">
						Enter <strong className="text-foreground font-medium">Rafli</strong>{' '}
						— a platform designed from the ground up to make every step of a
						sweepstakes visible, verifiable, and fair. From the moment a host
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

			<ScrollReveal>
				<section className="mb-17.5">
					<SectionLabel>The Problem</SectionLabel>
					<h2 className="font-clash-display text-foreground text-display-fluid-lg/headline tracking-display-mid mb-5.5 font-extrabold">
						Why Traditional Sweepstakes Have a Trust Crisis
					</h2>
					<p className="text-foreground/80 mb-4.5 font-light">
						The sweepstakes industry — spanning physical events, social media
						giveaways, and dedicated platforms — generates billions in
						participation every year. Yet the infrastructure underpinning most
						of these draws remains surprisingly opaque.{' '}
						<strong className="text-foreground font-medium">
							Who is the host? How are winners chosen? Can results be
							manipulated?
						</strong>{' '}
						These aren&apos;t fringe concerns; they&apos;re the lived experience
						of millions of participants.
					</p>
					<p className="text-foreground/80 mb-4.5 font-light">
						Rafli&apos;s founders identified three core failure points in the
						legacy model: unverified hosts who could be anonymous bad actors,
						draw mechanisms that offer no auditability, and prize rules that can
						shift without notice. The result is an industry ripe for a
						transparency-first reinvention.
					</p>
				</section>
			</ScrollReveal>

			<ScrollReveal>
				<PullQuote
					quote="We built Rafli to make every step visible — from who's hosting the sweepstakes to how winners are selected."
					attribution="— Rafli founding team"
				/>
			</ScrollReveal>
		</>
	);
}
