import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * FAQ copy. Hardcoded here rather than pulled from a CMS because the
 * pricing page has no editorial cadence yet and a JSON fetch for four
 * static paragraphs would be pure overhead. When a CMS is introduced
 * (promoted from this module to `@/services/content/*`), the only shape
 * the consumer depends on is the `{ question, answer }` tuple below.
 *
 * Copy sourced from the pricing spec. Keep wording aligned with the
 * subscription mechanics documented in the backend README — inconsistent
 * answers here erode trust faster than any of the other pricing copy.
 */
const FAQ_ITEMS: readonly { question: string; answer: string }[] = [
	{
		question: 'What is a credit subscription?',
		answer:
			'You pay once and receive a permanent ticket discount plus free weekly pool entries. There is no recurring charge unless you choose to top up.',
	},
	{
		question: 'Does my subscription auto-renew?',
		answer:
			'No. Each subscription is a one-time purchase. You top up manually whenever you want.',
	},
	{
		question: 'Can I use my discount on any raffle?',
		answer:
			'Yes. Your discount applies to every active raffle on the platform with no restrictions.',
	},
	{
		question: 'Do my free pool tickets refresh?',
		answer:
			'Yes. Your free weekly pool tickets reset every week for as long as your subscription is active.',
	},
];

/**
 * Pricing FAQ — Radix Accordion wrapped in a white card.
 *
 * Visual contract (per Figma):
 * - Outer card: white surface, 24px radius, 60px vertical / 40px horizontal padding.
 * - Inner items: individual light-cyan (`#e1f8ff`) pills, 24px radius, separated
 *   by a 16px stack gap. The Radix primitive's default hairline border is
 *   neutralised (`border-none`) because the per-item surface already carries
 *   enough visual weight to stand on its own.
 * - Items ship `defaultValue` of every id so Figma's "all expanded" state
 *   hydrates on first paint; the accordion still collapses/reopens on click,
 *   matching the normal read-then-fold behaviour users expect from a FAQ.
 *
 * Rendered as a Server Component: the accordion primitive itself is client
 * (Radix handles the state), but the content is static so no props pipe
 * through a client boundary.
 */
export function PricingFaq() {
	const allValues = FAQ_ITEMS.map((_, index) => `faq-${index}`);

	return (
		<section
			aria-labelledby="pricing-faq-heading"
			className="flex w-full flex-col items-center gap-8 rounded-3xl bg-white px-6 py-10 sm:px-10 sm:py-12"
		>
			{/* `#182135` is the deep indigo the Figma design uses for section titles —
			    slightly warmer than black so it doesn't clash with the cyan pills. */}
			<h2
				id="pricing-faq-heading"
				className="font-clash-display text-h2 text-center font-semibold text-[#182135]"
			>
				Have a question?
			</h2>
			{/* `type="multiple"` + `defaultValue={allValues}` lands every item open
			    on mount, matching the Figma "all expanded" baseline. Users can still
			    click to collapse individually. */}
			<Accordion
				type="multiple"
				defaultValue={allValues}
				className="flex w-full flex-col gap-4"
			>
				{FAQ_ITEMS.map((item, index) => (
					<AccordionItem
						// Question text is stable and unique — safer key than the index.
						key={item.question}
						value={`faq-${index}`}
						className="rounded-3xl border-none bg-[#e1f8ff] px-6 py-2 sm:px-8"
					>
						<AccordionTrigger className="py-6 text-left text-base font-semibold text-black hover:no-underline sm:text-lg">
							{item.question}
						</AccordionTrigger>
						<AccordionContent className="max-w-[796px] pt-0 pb-6 text-sm font-medium text-black sm:text-base">
							{item.answer}
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</section>
	);
}
