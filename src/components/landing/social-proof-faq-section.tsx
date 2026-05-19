import { ArrowUpRight, Star } from 'lucide-react';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/class-names';
import {
	TRUSTPILOT_PROFILE_URL,
	TRUSTPILOT_RATING,
	TRUSTPILOT_RATING_LABEL,
	TRUSTPILOT_REVIEW_COUNT,
	TRUSTPILOT_REVIEWS,
	type TrustpilotReview,
} from '@/lib/trustpilot';

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
 * boundary internally; the Trustpilot panel + review grid are static markup
 * so the section ships in the initial HTML and contributes to SEO.
 *
 * Layout: `lg+` two equal columns. Left column stacks the green Trustpilot
 * trust panel on top of a 2-up review grid; right column hosts the FAQ
 * accordion.
 *
 * Why a static panel instead of TrustBox / Business API: TrustBox iframes
 * are routinely blocked by adblockers (leaving the bare `<a>Trustpilot</a>`
 * placeholder visible), and the Business API requires the Plus plan EARN'M
 * is not on. A hand-styled panel + curated review cards renders cleanly in
 * every loading state and still funnels curious visitors to the verifiable
 * profile.
 *
 * @returns Full-width section with Trustpilot panel + review grid + FAQ
 */
export function SocialProofFaqSection() {
	return (
		<section
			id="faq"
			className="bg-secondary border-border scroll-mt-24 border-y"
		>
			<div className="max-w-wide mx-auto px-6 py-20 lg:px-27 lg:py-24">
				<h2 className="font-clash-display text-brand-dark text-headline-lg lg:text-60 mb-12 text-center font-semibold lg:mb-16">
					Trusted by community!
				</h2>
				<div className="grid items-start gap-6 lg:grid-cols-2">
					<TrustpilotColumn />
					<FaqColumn />
				</div>
			</div>
		</section>
	);
}

function TrustpilotColumn() {
	return (
		<div className="flex flex-col gap-4">
			<TrustpilotPanel />
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{TRUSTPILOT_REVIEWS.map(review => (
					<ReviewCard key={review.id} review={review} />
				))}
			</div>
		</div>
	);
}

function TrustpilotPanel() {
	return (
		<a
			href={TRUSTPILOT_PROFILE_URL}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`${TRUSTPILOT_RATING} out of 5 on Trustpilot · ${TRUSTPILOT_REVIEW_COUNT} reviews — read all on Trustpilot`}
			className="bg-trustpilot text-on-dark group flex flex-col gap-3 rounded-2xl p-6 transition-opacity hover:opacity-95"
		>
			<div className="inline-flex items-center gap-1.5">
				<Star
					aria-hidden="true"
					className="size-4"
					fill="currentColor"
					strokeWidth={0}
				/>
				<span className="text-sm font-bold">Trustpilot</span>
			</div>

			<div className="font-clash-display text-5xl/none font-semibold">
				{TRUSTPILOT_RATING.toFixed(1)}
			</div>

			<PanelStarsRow rating={TRUSTPILOT_RATING} />

			<p className="text-xs opacity-90">
				{TRUSTPILOT_RATING_LABEL} · {TRUSTPILOT_REVIEW_COUNT} reviews
			</p>

			<span className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2">
				Read all reviews
				<ArrowUpRight aria-hidden="true" className="size-3" />
			</span>
		</a>
	);
}

interface PanelStarsRowProps {
	readonly rating: number;
}

// Plain white stars on the green panel — the box-with-overlay treatment
// the review cards use would disappear against the same Trustpilot green,
// so the panel renders the stars as solid glyphs with dim opacity on the
// fractional/unfilled slot.
function PanelStarsRow({ rating }: PanelStarsRowProps) {
	const filled = Math.round(rating);
	return (
		<div aria-hidden="true" className="flex gap-0.5">
			{[1, 2, 3, 4, 5].map(position => (
				<Star
					key={position}
					className={cn(
						'size-4',
						position <= filled ? 'opacity-100' : 'opacity-40',
					)}
					fill="currentColor"
					strokeWidth={0}
				/>
			))}
		</div>
	);
}

interface ReviewCardProps {
	readonly review: TrustpilotReview;
}

function ReviewCard({ review }: ReviewCardProps) {
	return (
		<article className="bg-card border-border flex flex-col gap-3 rounded-2xl border p-5">
			<CardStarsRow rating={review.stars} />
			<h3 className="text-ink-900 text-sm font-semibold">{review.title}</h3>
			<p className="text-ink-500 flex-1 text-xs/relaxed">{review.quote}</p>
			<p className="text-ink-400 mt-auto text-xs">
				{review.authorName} · {review.country}
			</p>
		</article>
	);
}

interface CardStarsRowProps {
	readonly rating: TrustpilotReview['stars'];
}

// Green squares with a white star overlay — Trustpilot's signature card
// glyph. Dimmed positions use `bg-border` so the unfilled state reads as
// "off" without introducing a fourth neutral token.
function CardStarsRow({ rating }: CardStarsRowProps) {
	return (
		<div aria-label={`${rating} out of 5 stars`} className="flex gap-0.5">
			{[1, 2, 3, 4, 5].map(position => {
				const isFilled = position <= rating;
				return (
					<div
						key={position}
						className={cn(
							'flex size-5 items-center justify-center rounded-xs',
							isFilled ? 'bg-trustpilot' : 'bg-border',
						)}
					>
						<Star
							className="text-on-dark size-3"
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
