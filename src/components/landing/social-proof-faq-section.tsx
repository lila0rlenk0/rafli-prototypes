import { ArrowUpRight, Star } from 'lucide-react';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/class-names';

// Public Trustpilot profile for the app.earnm.com business unit. The Rafli
// brand inherits this trust signal from EARN'M (Rafli is an EARN'M Foundation
// subsidiary — see CLAUDE.md). Deep-linked from the trust panel CTA.
const TRUSTPILOT_PROFILE_URL =
	'https://www.trustpilot.com/review/app.earnm.com';

// Trust signal copy. Numbers are hand-maintained — the official Trustpilot
// API requires the Plus plan ($319/mo) for live access, and the JS TrustBox
// widget is routinely blocked by adblockers, so a static styled panel was
// the most reliable surface that still hits the brand bar. Refresh these
// values when EARN'M renegotiates the plan tier or quarterly when reviewing
// marketing collateral.
const TRUSTPILOT_RATING = 4.6;
const TRUSTPILOT_REVIEW_COUNT = 449;
const TRUSTPILOT_RATING_LABEL = 'Rated Excellent';

interface Faq {
	readonly id: string;
	readonly question: string;
	readonly answer: string;
}

const FAQS: readonly Faq[] = [
	{
		id: 'winners',
		question: 'How are winners chosen?',
		answer:
			'Every draw uses on-chain randomness (Chainlink VRF). The result is verifiable on-chain by anyone. No one, including us, can predict or influence the outcome.',
	},
	{
		id: 'odds',
		question: 'What are my odds of winning?',
		answer:
			'Your odds equal your entries divided by total entries sold. We show this clearly on every sweepstakes before you enter.',
	},
	{
		id: 'kyc',
		question: 'Do I need to complete KYC?',
		answer:
			'Basic verification (email and phone) is required to enter paid sweepstakes. For payouts above $1,000, government ID may be needed in certain regions.',
	},
	{
		id: 'countries',
		question: 'Which countries are supported?',
		answer:
			'Rafli is available in 40+ countries. Some prize types and payment methods vary by location.',
	},
	{
		id: 'host',
		question: 'How do I host a sweepstakes?',
		answer:
			"Apply to become a verified host. We'll review your application and guide you through your first sweepstakes.",
	},
	{
		id: 'partial-participation',
		question:
			"What if a sweepstakes doesn't reach minimum entries or minimum participants?",
		answer:
			'The sweepstakes concludes under Partial Participation: winners are still selected by Chainlink VRF, but instead of the declared prize they receive a cash distribution from the entry revenue, split equally between winners after a small platform fee.',
	},
];

/**
 * Combined "Trusted by community" social proof + FAQ section.
 *
 * Server Component shell. The Accordion primitive carries its own client
 * boundary internally; the Trustpilot panel is static markup so the section
 * ships in the initial HTML and contributes to SEO.
 *
 * Layout: lg+ two equal columns, stacked below.
 *
 * Why the static panel instead of TrustBox / Business API: TrustBox iframes
 * are routinely blocked by adblockers (leaving the bare `<a>Trustpilot</a>`
 * placeholder visible), and the Business API requires the Plus plan EARN'M
 * is not on. A hand-styled panel with the live trust signal copy + a
 * prominent deep-link to the public profile reads cleanly in every loading
 * state and still funnels curious visitors to the verifiable reviews list.
 *
 * @returns Full-width section with Trustpilot trust panel + FAQ accordion
 */
export function SocialProofFaqSection() {
	return (
		<section
			id="faq"
			className="bg-secondary border-border scroll-mt-24 border-y"
		>
			<div className="max-w-wide mx-auto px-6 py-20 lg:px-27 lg:py-24">
				<h2 className="font-clash-display text-brand-dark text-headline-lg lg:text-60 mb-12 text-center font-semibold lg:mb-16">
					Trusted by community.
				</h2>
				<div className="grid items-stretch gap-6 lg:grid-cols-2">
					<TrustpilotPanel />
					<FaqColumn />
				</div>
			</div>
		</section>
	);
}

function TrustpilotPanel() {
	return (
		<a
			href={TRUSTPILOT_PROFILE_URL}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`${TRUSTPILOT_RATING} out of 5 on Trustpilot · ${TRUSTPILOT_REVIEW_COUNT} reviews — read all on Trustpilot`}
			className="bg-card border-border hover:border-brand-dark group flex h-full flex-col items-center justify-center gap-6 rounded-2xl border p-8 text-center transition-colors duration-150"
		>
			<div className="bg-trustpilot text-on-dark inline-flex items-center gap-2 rounded-xl px-4 py-2">
				<Star
					aria-hidden="true"
					className="size-5"
					fill="currentColor"
					strokeWidth={0}
				/>
				<span className="text-body-md font-bold">Trustpilot</span>
			</div>

			<div className="font-clash-display text-brand-dark text-6xl/none font-semibold">
				{TRUSTPILOT_RATING.toFixed(1)}
			</div>

			<TrustpilotStarsRow rating={TRUSTPILOT_RATING} />

			<p className="text-ink-500 text-body-md">
				{TRUSTPILOT_RATING_LABEL} · {TRUSTPILOT_REVIEW_COUNT} reviews
			</p>

			<span className="text-brand-dark inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
				Read all reviews
				<ArrowUpRight aria-hidden="true" className="size-4" />
			</span>
		</a>
	);
}

interface TrustpilotStarsRowProps {
	readonly rating: number;
}

// Trustpilot's stars render as filled white stars on a green square — the
// visual signature consumers recognise on the live profile. We mirror that
// glyph here so the panel reads as Trustpilot-native at a glance.
function TrustpilotStarsRow({ rating }: TrustpilotStarsRowProps) {
	const filled = Math.round(rating);
	return (
		<div aria-hidden="true" className="flex gap-1">
			{[1, 2, 3, 4, 5].map(position => {
				const isFilled = position <= filled;
				return (
					<div
						key={position}
						className={cn(
							'flex size-7 items-center justify-center rounded',
							isFilled ? 'bg-trustpilot' : 'bg-border',
						)}
					>
						<Star
							className="text-on-dark size-4"
							fill="currentColor"
							strokeWidth={0}
						/>
					</div>
				);
			})}
		</div>
	);
}

function FaqColumn() {
	return (
		<div className="bg-card border-border flex h-full flex-col rounded-2xl border p-6 lg:px-8">
			<h3 className="font-clash-display text-brand-dark text-headline-lg mb-2 font-semibold">
				Questions, answered.
			</h3>
			<Accordion type="single" collapsible className="w-full">
				{FAQS.map(faq => (
					<AccordionItem
						key={faq.id}
						value={faq.id}
						className="border-border last:border-b-0"
					>
						<AccordionTrigger className="text-brand-dark text-body-sm py-4 font-semibold hover:no-underline">
							{faq.question}
						</AccordionTrigger>
						<AccordionContent className="text-ink-500 text-body-sm pb-4">
							{faq.answer}
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
}
