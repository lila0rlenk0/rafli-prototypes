'use client';

import Image from 'next/image';

import { ScrollReveal } from '@/components/ui-custom/scroll-reveal';
import {
	PRESS_IMAGES,
	SectionLabel,
} from '@/components/landing/press-release/section-primitives';

/**
 * Closing half — the "Looking Ahead" manifesto and the press-contact
 * card. Kept together so the pitch-to-contact handoff stays continuous.
 *
 * @returns Press-release closing section and contact card.
 */
export function PressArticleClosing() {
	return (
		<>
			<ScrollReveal>
				<section className="mb-17.5">
					<SectionLabel>Looking Ahead</SectionLabel>
					<h2 className="font-clash-display text-foreground text-display-fluid-lg/headline tracking-display-mid mb-5.5 font-extrabold">
						Fair Sweepstakes. Real Prizes. No Funny Business.
					</h2>
					<p className="text-foreground/80 mb-4.5 font-light">
						Rafli&apos;s tagline is deliberately blunt — and that&apos;s the
						point. In a space where vague promises and anonymous operators have
						eroded trust, Rafli is betting that radical transparency is not just
						a differentiator but a necessity.
					</p>
					<p className="text-foreground/80 mb-4.5 font-light">
						By making verification, rule-locking, and on-chain winner selection
						the default — not a premium feature — Rafli is setting a new
						standard for what a sweepstakes platform should be. For participants
						tired of wondering if the game is rigged, and for hosts who want
						their audience to take them seriously,{' '}
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

			<ScrollReveal>
				<section className="bg-paper-100 rounded-2xl px-6 py-9 sm:px-10">
					<SectionLabel>Press Contact</SectionLabel>
					<h3 className="font-clash-display text-body-md text-foreground tracking-display-sm mb-3.5 font-bold">
						Media Inquiries
					</h3>
					<p className="text-foreground/80 mb-4.5 font-light">
						For interviews, demos, press assets, or additional information about
						Rafli, please reach out to the team directly.
					</p>
					<p className="text-foreground/80 font-light">
						<strong className="text-foreground font-medium">Website:</strong>{' '}
						[Insert URL]
						<br />
						<strong className="text-foreground font-medium">Email:</strong>{' '}
						[Insert press contact email]
						<br />
						<strong className="text-foreground font-medium">
							Social:
						</strong>{' '}
						[Insert handles]
					</p>
					<p className="text-mini text-ink-400 mt-2.5">
						Rafli is a subsidiary of EARN&apos;M Foundation. © 2026 Rafli — All
						rights reserved.
					</p>
				</section>
			</ScrollReveal>
		</>
	);
}
