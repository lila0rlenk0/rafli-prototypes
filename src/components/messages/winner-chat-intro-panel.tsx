'use client';

import { ChevronDown, Package } from 'lucide-react';
import { useState } from 'react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { WinningStatus } from '@/types/winning';

import type { ViewerRole } from './chat-utils';
import { WinnerChatActions } from './winner-chat-actions';
import { WinningStatusStepper } from './winning-status-stepper';

interface WinnerChatIntroPanelProps {
	readonly currentStatus: WinningStatus;
	readonly raffleId: string;
	/**
	 * Winning row UUID pulled from the latest `shipment_update` metadata.
	 * Null during the initial `pending` window (no transition yet); the
	 * pending action only needs `raffleId` so this isn't a blocker.
	 */
	readonly winningId: string | null;
	readonly viewerRole: ViewerRole | null;
}

/**
 * Enriched replacement for the backend-seeded
 * "Winner chat created for prize coordination." system message. Winners
 * and hosts land in a fresh winner_chat with no prior context — the one-
 * liner alone left them wondering "what happens next?". Pairing the
 * intro copy with a stepper + role-aware CTAs makes the full state
 * machine actionable in-place: winners claim / confirm without leaving
 * the chat, hosts mark-sent / mark-delivered from the same surface.
 *
 * Rendered once at the top of the message list for winner_chat
 * conversations. The original seed message (and every `shipment_update`
 * echo) is filtered out in `ConversationView` so the panel owns the
 * state narrative end-to-end — see `WINNER_CHAT_SEED_BODY` in
 * `chat-utils.ts`.
 *
 * Collapsibility: hosts managing many winner chats reported the panel
 * dominating the scroll column, pushing the conversation itself below
 * the fold on short viewports. The stepper + actions now live inside a
 * Radix Collapsible so the header (icon + title + subtitle) stays as a
 * quiet anchor while the coordination surface tucks away on demand.
 * Defaults closed — the chat itself is the primary surface; hosts and
 * winners open the stepper on demand via the header row. Radix's
 * `data-state` drives the chevron rotation + content slide without a
 * manual transition class.
 */
export function WinnerChatIntroPanel({
	currentStatus,
	raffleId,
	winningId,
	viewerRole,
}: WinnerChatIntroPanelProps) {
	// Local-only open state — no persistence across navigations yet.
	// Defaults CLOSED: hosts managing many winner chats reported the
	// expanded panel dominated the scroll column and pushed conversation
	// history below the fold. Keeping it collapsed on mount lets the chat
	// itself be the primary surface; winners and hosts who need the
	// coordination actions are one tap away via the header row. If we
	// see winners missing the stepper on first entry we'll flip this to
	// status-aware (open for pending/awaiting-host, closed once sent).
	const [open, setOpen] = useState(false);

	return (
		// Full-width surface (not a chat bubble) — drops the `max-w-[85%]`
		// clamp the system-message bubble uses so the stepper has the entire
		// content column to breathe. `w-full` lands naturally inside the
		// scroll container's `px-4`, keeping the panel flush with the
		// horizontal rhythm of the message list.
		//
		// Palette choice: `bg-accent-cream/50` ties the panel to the brand's
		// warm cream accent without the full-intensity promo surfaces
		// (`bg-accent-yellow`) used on browse. The chat surface should read
		// as a workspace, not a banner — the tint is subtle enough that
		// bodies of text still sit comfortably, but present enough that the
		// panel reads as a distinct coordination affordance, not a stock
		// SaaS callout.
		//
		// Semantic layering: outer `<section>` carries the landmark +
		// `aria-labelledby` so screen readers announce the panel as a
		// named region. Putting aria-label on `<Collapsible>` directly
		// would stamp it on Radix's plain `<div>` — semantically inert.
		// The trigger button inside already exposes aria-expanded, so AT
		// users get the full region label + state without redundant
		// announcements.
		<section
			aria-labelledby={PANEL_TITLE_ID}
			className="bg-accent-cream/50 w-full rounded-2xl border border-black/10"
		>
			<Collapsible open={open} onOpenChange={setOpen} className="flex flex-col">
				{/* Whole header row IS the trigger — larger hit target than
				    a bare chevron button, and matches the pattern users
				    already learned from shadcn's Accordion + Collapsible
				    demos. The inner chevron rotates via Radix's
				    `data-state="open|closed"` attribute, so we don't need
				    a separate open/closed prop threaded down or a
				    `motion-safe:` guard — a transform transition is
				    already part of the motion allowlist. */}
				<CollapsibleTrigger
					className={cn(
						'group flex w-full items-center gap-4 rounded-2xl p-5 text-left transition-colors duration-150 sm:p-6',
						// Focus ring vocabulary matches shadcn Button so the
						// trigger is keyboard-reachable without `outline-none`.
						// `ring-offset-2` lifts the ring off the cream fill so
						// it reads as a crisp halo rather than a tinted border.
						'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
						// Hover + active — cream tint deepens progressively so
						// the trigger reads as interactive without clashing
						// with the base fill. `data-[state=open]` tints the
						// trigger row too so the open state has a distinct
						// header color, anchoring the collapsed content below.
						'hover:bg-accent-cream/70 active:bg-accent-cream/80',
					)}
				>
					{/* Icon pill echoes the brand's "pill + hairline black
					    stroke" language at chat scale — size-10 so the icon
					    reads as the panel's visual anchor, not a decorative
					    bullet. Yellow fill + black glyph matches the hero
					    CTA pattern used on browse and pricing, so the
					    winner's first impression of the coordination
					    surface is visually continuous with where they came
					    from. */}
					<span className="bg-accent-yellow flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-black">
						<Package aria-hidden="true" className="size-[18px]" />
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<h3
							id={PANEL_TITLE_ID}
							className="font-clash-display text-foreground text-base leading-tight font-semibold tracking-tight"
						>
							Prize coordination
						</h3>
						<p className="text-foreground/70 text-xs leading-snug">
							Each step shows who acts next. The highlight marks where things
							stand now.
						</p>
					</div>
					{/* Chevron flips 180° on expand. `motion-reduce:transition-none`
					    respects the reduced-motion preference without killing
					    the final rotated state — the icon still reflects
					    open/closed, it just snaps instead of animating.
					    `ease-out` matches tw-animate-css's collapsible timing
					    so the icon and the content slide feel linked, not two
					    independent tweens. */}
					<ChevronDown
						aria-hidden="true"
						className={cn(
							'text-foreground/60 size-5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
							'group-data-[state=open]:rotate-180',
						)}
					/>
				</CollapsibleTrigger>
				{/* Radix adds `data-state` here too — used by tw-animate-css's
				    built-in `animate-collapsible-*` utilities for the slide.
				    Inner `pt-0` keeps the header↔content rhythm aligned with
				    the original `gap-4` between icon row and stepper. */}
				<CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
					<div className="flex flex-col gap-4 px-5 pt-2 pb-5 sm:px-6 sm:pb-6">
						<WinningStatusStepper
							currentStatus={currentStatus}
							actionSlot={
								<WinnerChatActions
									raffleId={raffleId}
									winningId={winningId}
									currentStatus={currentStatus}
									viewerRole={viewerRole}
								/>
							}
						/>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</section>
	);
}

// Stable id for the `aria-labelledby` wiring between the outer section
// and the title heading. Constant because the panel is rendered at most
// once per conversation — no collision risk, and keeping it module-scope
// means we don't pay for a `useId` allocation on every render of a
// frequently-re-rendered chat view.
const PANEL_TITLE_ID = 'winner-chat-intro-panel-title';
