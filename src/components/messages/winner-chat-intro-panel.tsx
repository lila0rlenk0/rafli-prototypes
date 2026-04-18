import { Package } from 'lucide-react';

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
 */
export function WinnerChatIntroPanel({
	currentStatus,
	raffleId,
	winningId,
	viewerRole,
}: WinnerChatIntroPanelProps) {
	// Full-width surface (not a chat bubble) — drops the `max-w-[85%]`
	// clamp the system-message bubble uses so the stepper has the entire
	// content column to breathe. `w-full` lands naturally inside the
	// scroll container's `px-4`, keeping the panel flush with the horizontal
	// rhythm of the message list.
	//
	// Palette choice: `bg-accent-cream/50` ties the panel to the brand's warm
	// cream accent without the full-intensity promo surfaces (`bg-accent-
	// yellow`) used on browse. The chat surface should read as a workspace,
	// not a banner — the tint is subtle enough that bodies of text still sit
	// comfortably, but present enough that the panel reads as a distinct
	// coordination affordance, not a stock SaaS callout.
	//
	// Padding rhythm: `p-5` on phones, `sm:p-6` once the chat pane has
	// breathing room. Inner `gap-4` (vs the stepper rows' `pb-4`) creates a
	// deliberate beat — header to stepper separation slightly larger than
	// step-to-step, so the header reads as a distinct section rather than
	// "first row of the stepper".
	return (
		<section
			aria-label="Prize coordination status"
			className="bg-accent-cream/50 flex w-full flex-col gap-4 rounded-2xl border border-black/10 p-5 sm:p-6"
		>
			<header className="flex items-start gap-4">
				{/* Icon pill echoes the brand's "pill + hairline black stroke"
				    language at chat scale — size-10 so the icon reads as the
				    panel's visual anchor, not a decorative bullet. Yellow fill +
				    black glyph matches the hero CTA pattern used on browse and
				    pricing, so the winner's first impression of the coordination
				    surface is visually continuous with where they came from. */}
				<span className="bg-accent-yellow flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-black">
					<Package aria-hidden="true" className="size-[18px]" />
				</span>
				<div className="flex min-w-0 flex-col gap-1">
					<h3 className="font-clash-display text-foreground text-base leading-tight font-semibold tracking-tight">
						Prize coordination
					</h3>
					<p className="text-foreground/70 text-xs leading-snug">
						Each step shows who acts next. The highlight marks where things
						stand now.
					</p>
				</div>
			</header>
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
		</section>
	);
}
