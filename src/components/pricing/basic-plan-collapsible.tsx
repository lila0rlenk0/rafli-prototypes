'use client';

// Client boundary: Radix `Collapsible` owns the open/close state and the
// `data-state` attribute the chevron rotation hooks into. The card content
// itself remains a Server Component — passed in via `children` so the
// server-rendered HTML streams unchanged into the collapsed slot.

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BasicPlanCollapsibleProps {
	/**
	 * The Basic plan card to reveal. Passed as `children` (not a typed prop)
	 * so the consumer can render a Server Component into the slot — keeping
	 * pricing data resolution server-side instead of round-tripping the plan
	 * payload through this client boundary.
	 */
	children: ReactNode;
	/**
	 * Open the collapsible by default. Used when the viewer is already
	 * subscribed to Basic — surfacing their current plan inside a hidden
	 * panel would force them to hunt for the manage CTA.
	 */
	defaultOpen?: boolean;
}

/**
 * Reveal-on-demand wrapper around the Basic plan card.
 *
 * The "Want to start smaller?" affordance previously lived inside the launch
 * countdown banner as a passive `/browse` link. We hoisted it to a dedicated
 * collapsible because the Basic tier is now a real product surface (not just
 * a deflection to free browsing) — so the trigger needs to expand the card
 * inline rather than navigate away. Keeping it collapsed by default means
 * the upper grid stays the focus for first-time viewers; users who want a
 * smaller tier opt in explicitly.
 *
 * @param children - Server-rendered Basic plan card.
 * @param defaultOpen - Render the card expanded on first paint.
 * @returns Collapsible block with a "Want to start smaller?" trigger and the
 *   Basic plan card as its content.
 */
export function BasicPlanCollapsible({
	children,
	defaultOpen = false,
}: BasicPlanCollapsibleProps) {
	return (
		<Collapsible defaultOpen={defaultOpen} className="flex flex-col gap-6">
			{/* Trigger styled as a centred underlined link rather than a filled
			    button — the action is "reveal more", not a primary CTA, so it
			    should read as quietly opt-in. `group` + Radix `data-state` lets
			    the chevron flip on open without a state hook on this component. */}
			<CollapsibleTrigger className="focus-visible:ring-ring/50 group inline-flex items-center justify-center gap-2 self-center rounded-sm text-sm font-medium underline underline-offset-4 hover:no-underline focus-visible:ring-3 focus-visible:outline-none">
				<span>Want to start smaller?</span>
				<ChevronDown
					aria-hidden
					// `transition-transform` over the broad `transition` keeps the
					// rotation from re-painting unrelated styles (project rule). Flip
					// keys off the Radix `data-state` so the trigger stays declarative
					// — no React state, no useEffect.
					className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
				/>
			</CollapsibleTrigger>

			{/* Height-tween via `tw-animate-css` keyframes driven by Radix's
			    `--radix-collapsible-content-height` custom property. `overflow-
			    hidden` clips the content as it expands so the surrounding column
			    layout doesn't briefly bulge before settling. Same pattern used
			    by `messages/winner/intro-panel.tsx`. */}
			<CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}
