import Image from 'next/image';

import { ScrollReveal } from '@/components/ui-custom/scroll-reveal';
import {
	PRESS_IMAGES,
	PullQuote,
	SectionLabel,
} from '@/components/landing/press-release/section-primitives';

/**
 * Audience-addressed half — speaks to participants and hosts directly,
 * capped by the second pull quote that bridges into the closing
 * sections.
 */
export function PressArticleAudiences() {
	return (
		<>
			<ScrollReveal>
				<section className="mb-17.5">
					<SectionLabel>For Participants</SectionLabel>
					<h2 className="font-clash-display text-foreground text-display-fluid-lg/headline tracking-display-mid mb-5.5 font-extrabold">
						Join Sweepstakes With Full Confidence
					</h2>
					<p className="text-foreground/80 mb-4.5 font-light">
						For the millions of people who love the thrill of a good
						sweepstakes, Rafli delivers something the market has never reliably
						offered:{' '}
						<strong className="text-foreground font-medium">
							peace of mind.
						</strong>{' '}
						When you enter a Rafli draw, you know exactly what you&apos;re
						getting — a fair shot at a real prize, with a host who has been
						verified and rules that can&apos;t be changed mid-game.
					</p>
					<p className="text-foreground/80 mb-4.5 font-light">
						The platform spans an expansive and ever-refreshing catalogue of
						prizes. Tech gadgets, limited-edition collectibles, digital items,
						fashion accessories, experiences — something new surfaces every
						single day. For collectors, enthusiasts, and deal-seekers alike,
						Rafli offers a legitimate and exciting new discovery channel.
					</p>
					<Image
						src={PRESS_IMAGES.raffleList}
						alt="Sweepstakes listings on Rafli"
						width={1600}
						height={500}
						className="mt-8 w-full rounded-2xl"
					/>
				</section>
			</ScrollReveal>

			<ScrollReveal>
				<section className="mb-17.5">
					<SectionLabel>For Hosts</SectionLabel>
					<h2 className="font-clash-display text-foreground text-display-fluid-lg/headline tracking-display-mid mb-5.5 font-extrabold">
						Run Your Own Sweepstakes Without the Headache
					</h2>
					<p className="text-foreground/80 mb-4.5 font-light">
						With Rafli, a host can go from idea to live sweepstakes in just a
						few steps:{' '}
						<strong className="text-foreground font-medium">
							get verified, set your prize and rules, launch, and share.
						</strong>{' '}
						The platform handles the mechanics — the draw, the record-keeping,
						the winner communication — so hosts can focus on what actually
						matters: building excitement around their offering.
					</p>
					<p className="text-foreground/80 mb-4.5 font-light">
						Because every draw on Rafli carries the platform&apos;s trust
						infrastructure, hosts benefit from immediate credibility, even if
						their audience has never heard of them before.
					</p>
					<Image
						src={PRESS_IMAGES.raffleDetails}
						alt="Rafli sweepstakes details page"
						width={1600}
						height={900}
						className="mt-8 w-full rounded-2xl"
					/>
				</section>
			</ScrollReveal>

			<ScrollReveal>
				<PullQuote
					quote="Something new every day. Tech gadgets, collectibles, digital items, art, accessories, experiences — you never know what's coming next."
					attribution="— Rafli platform promise"
				/>
			</ScrollReveal>
		</>
	);
}
