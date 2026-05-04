import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Yellow subscribe-upsell card shown to non-subscribed viewers on the public
 * raffle detail page. Anchors the "up to 20% in discounts" benefit and
 * routes to `/pricing` so the visitor can convert without losing context of
 * the raffle they were considering.
 *
 * Visibility gating lives in the parent (`RaffleRightColumnAsync`) — this
 * component assumes the caller has already decided the viewer should see
 * the upsell. Keeping the gate up there avoids a guest-vs-subscriber check
 * inside a leaf component that has no other reason to know about session
 * state, and lets the parent share its `ctx.subscription` read with the
 * existing `<ActiveCard>` purchase flow.
 *
 * Why a `<Link>` (not a `useMutation` or analytics-wrapped click handler):
 * the conversion event fires on the destination page (Stripe checkout
 * dispatch) — adding a click handler here would only duplicate funnel
 * counting and force this card to become a Client Component for no behavior
 * gain.
 *
 * @returns Yellow upsell card with a single dark "Claim Offer" CTA.
 */
export function SubscribeUpsellCard() {
	return (
		<aside className="bg-brand-yellow border-brand-dark flex flex-col items-center gap-6 rounded-3xl border p-8 text-center">
			<h3 className="font-clash-display text-headline-md text-foreground font-semibold">
				Unlock up to 20% in Discounts!
			</h3>
			<Button asChild size="lg" className="w-full rounded-full font-semibold">
				<Link href="/pricing">Claim Offer</Link>
			</Button>
		</aside>
	);
}
