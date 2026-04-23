import type { Metadata } from 'next';

import { LegalSection } from '@/components/landing/legal';

import { TERMS_SECTIONS } from './sections';

export const metadata: Metadata = {
	title: 'Terms of Service',
	description:
		'Rafli Terms of Service — paid and free entry, refund and cancellation policy, records retention, and dispute resolution for Rafli sweepstakes.',
};

/**
 * Terms of Service page.
 *
 * Server Component — static legal content, no interactivity.
 *
 * Content authoritatively describes the legal framework used across the
 * checkout surfaces. The primary lottery-test defense is the "No Purchase
 * Necessary" + AMOE pattern: the free Alternative Method of Entry removes
 * the "consideration" element for anyone who uses it, so paid entries do
 * not convert a raffle into an unlicensed lottery. Every consumer-facing
 * transaction the site offers is explained so operator intent is defensible
 * in an enforcement action — reviewers look at the public Terms alongside
 * the UI before piercing the veil.
 */
export default function TermsPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			<header className="mb-10">
				<h1 className="font-clash-display mb-2 text-4xl font-bold sm:text-5xl">
					Terms of Service
				</h1>
				<p className="text-muted-foreground text-sm">
					Last updated: 17 April 2026
				</p>
			</header>

			<div className="flex flex-col gap-8 text-sm/relaxed">
				{TERMS_SECTIONS.map(section => (
					<LegalSection key={section.title} title={section.title}>
						{section.body}
					</LegalSection>
				))}
			</div>
		</div>
	);
}
