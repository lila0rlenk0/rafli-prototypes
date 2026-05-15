import { Button } from '@/components/ui/button';

import { SUBSCRIBE_HERO_ANCHOR_ID } from './offer';
import type { SubscribePlan } from './plans';

interface CtaSectionProps {
	readonly plan: SubscribePlan;
}

/**
 * Final CTA panel at the bottom of the subscribe page.
 *
 * Mirrors the hero's yellow payout pill — the page opens with the
 * promise and closes by re-asking the visitor to act on it. Instead
 * of linking off to a separate sign-up route (the pre-Fanbasis
 * flow), this CTA scrolls back to the hero form so the visitor can
 * complete the single checkout path without a route transition.
 * `smooth` scroll behavior is already set on `html` (globals.css),
 * so a plain `#id` anchor produces the correct animated scroll with
 * no extra JS.
 *
 * Figma spec: 1231×291 container, 24px corners, 1px black hairline,
 * 60px vertical padding (`py-15`), 16px inter-element gap
 * (`gap-4`). Heading drops from the default H2 (48px) to the Figma
 * 35/36 target via `text-headline-lg` with 1% letter-spacing; the
 * shorter copy doesn't need the full display weight on a closing CTA.
 *
 * @param plan - Plan config — supplies the payout figure echoed in the
 *   body copy so the closer matches the hero's headline amount.
 * @returns Yellow panel with heading, description, CTA anchor, and
 *   disclaimer copy
 */
export function CtaSection({ plan }: CtaSectionProps) {
	return (
		<section className="pb-16 md:pb-20">
			<div className="bg-brand-yellow border-ink-900 flex flex-col items-center gap-4 rounded-3xl border px-6 py-12 md:px-14 md:py-16">
				<h2 className="font-clash-display text-headline-lg text-ink-800 tracking-caps-1 text-center font-semibold">
					Ready to enter?
				</h2>
				<p className="text-body-md text-ink-alpha max-w-3xl text-center font-medium">
					Get your ${plan.payoutUsd} in credits now and use them on any active
					raffle above.
				</p>
				<Button
					asChild
					size="lg"
					className="h-12 w-full max-w-md rounded-full font-semibold"
				>
					<a href={`#${SUBSCRIBE_HERO_ANCHOR_ID}`}>
						Choose subscription and claim now
					</a>
				</Button>
				<p className="text-label-sm text-ink-500 max-w-3xl text-center">
					Cancel anytime · Monthly credits · No commitment
				</p>
			</div>
		</section>
	);
}
