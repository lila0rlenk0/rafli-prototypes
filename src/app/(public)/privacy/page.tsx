import type { Metadata } from 'next';

import { LegalSection } from '@/components/landing/legal';

import { PRIVACY_SECTIONS } from './sections';

export const metadata: Metadata = {
	title: 'Privacy Policy',
	description:
		'Rafli Privacy Policy — what we collect, how we use it, GDPR and CCPA rights, data retention, cookies, analytics consent.',
};

/**
 * Privacy Policy page.
 *
 * Server Component — static legal content, no interactivity.
 *
 * Covers GDPR Art. 13 notice obligations, CCPA §1798.100 right-to-know
 * disclosures, Brazil LGPD (lawful basis), and UK/EU cookie consent. The
 * cookie consent banner shipped elsewhere is the operational enforcement
 * of the "Cookies & Analytics" section, so both documents describe the
 * same categories.
 */
export default function PrivacyPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			<header className="mb-10">
				<h1 className="font-clash-display mb-2 text-4xl font-bold sm:text-5xl">
					Privacy Policy
				</h1>
				<p className="text-muted-foreground text-sm">
					Last updated: 17 April 2026
				</p>
			</header>

			<div className="flex flex-col gap-8 text-sm/relaxed">
				{PRIVACY_SECTIONS.map(section => (
					<LegalSection key={section.title} title={section.title}>
						{section.body}
					</LegalSection>
				))}
			</div>
		</div>
	);
}
