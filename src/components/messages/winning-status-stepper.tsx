import { AlertTriangle, Check, Circle, CircleDot } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { getWinningStatusLabel } from '@/lib/utils/winning-status-label';
import { WINNING_STATUS, type WinningStatus } from '@/types/winning';

/**
 * Descriptor for a single step in the stepper.
 *
 * `description` is the explanatory sub-line rendered below the label —
 * it translates backend transitions into end-user language (the backend
 * commands are named for operators, not winners).
 */
interface StepDescriptor {
	readonly status: WinningStatus;
	readonly description: string;
}

/**
 * Main-path steps in order. Mirrors the state machine in
 * `raffles-core-backend/src/core/winnings/` — `CreateWinningCommand`
 * seeds `pending`; then `ClaimPrize` → `MarkSent` → `MarkDelivered` →
 * `ConfirmReceived` (or `AutoConfirmDelivered` 48h after delivery per
 * `AUTO_CONFIRM_THRESHOLD_MS`) advance along this line.
 *
 * Legacy `pending_partial_fulfillment` is not listed — it collapses into
 * `pending` at the label layer and via `findMainPathIndex` so historic
 * DB rows still land on the first step instead of falling off the rail.
 */
const MAIN_PATH_STEPS: readonly StepDescriptor[] = [
	{
		status: WINNING_STATUS.PENDING,
		// Actor: winner. Gate: ClaimPrizeCommand. Writes claim details so the
		// host can coordinate fulfillment — copy stays prize-agnostic because
		// the flow is used for non-shippable prizes too (refunds, digital
		// handoffs, in-person coordination).
		description: 'Winner submits claim details to the host.',
	},
	{
		status: WINNING_STATUS.AWAITING_HOST,
		// Actor: host. Gate: MarkSentCommand. Proof URL (tracking / receipt /
		// transaction hash) is mandatory — the specific proof shape depends
		// on the fulfillment type.
		description: 'Host fulfills the prize and posts proof.',
	},
	{
		status: WINNING_STATUS.SENT,
		// Actor: winner (passive). Gate: MarkDeliveredCommand, fired by the
		// host once the winner signals receipt or the carrier webhook lands.
		description: 'Host has fulfilled. Awaiting winner receipt.',
	},
	{
		status: WINNING_STATUS.DELIVERED,
		// Actor: winner. Gate: ConfirmReceivedCommand, or the cron-driven
		// AutoConfirmDeliveredCommand after AUTO_CONFIRM_THRESHOLD_MS (48h)
		// so silent winners don't stall the flow indefinitely.
		description: 'Winner confirms receipt.',
	},
	{
		status: WINNING_STATUS.RECEIVED,
		// Terminal happy-path state. No next actor — retained on the rail
		// so the viewer sees the full arc including where it ends.
		description: 'Prize received. Case closed.',
	},
];

/**
 * Off-path dispute branch. Reachable from `sent | delivered | received`
 * via `InitiateDisputeCommand`; admins close it with
 * `ResolveDisputeCommand`. Rendered as a separate block so the mainline
 * stays linear and the winner still sees where progress stalled.
 */
const DISPUTE_BRANCH_STEPS: readonly StepDescriptor[] = [
	{
		status: WINNING_STATUS.DISPUTED,
		// Actor: platform admin. Gate: ResolveDisputeCommand. Mainline
		// transitions are blocked while in dispute (see backend command
		// guards) — neither winner nor host can act until resolution.
		description: 'Admin reviews the case. Flow paused.',
	},
	{
		status: WINNING_STATUS.RESOLVED,
		// Terminal dispute-path state. Resolution is final — the machine
		// does not loop back into the mainline after this point.
		description: 'Admin closed the case.',
	},
];

interface WinningStatusStepperProps {
	readonly currentStatus: WinningStatus;
	/**
	 * Optional CTA rendered under the currently-active step (mainline or
	 * dispute). The panel owns the button's business logic — the stepper
	 * stays presentational and just positions the slot so the CTA reads
	 * as "the action that advances this step".
	 */
	readonly actionSlot?: ReactNode;
}

/**
 * Vertical stepper that visualizes the winning state machine for a
 * winner_chat conversation.
 *
 * Why vertical (not horizontal): the chat pane is often narrow — long
 * labels like "Awaiting host" or "Delivered" wrap cleanly in a stacked
 * layout, and the dispute branch attaches underneath without a second
 * row of reflow. It also keeps each step's descriptive sub-line in the
 * same visual rhythm.
 *
 * Accessibility notes:
 * - Renders as an `<ol>` so screen readers announce the sequence.
 * - `aria-current="step"` marks the active row.
 * - State is never conveyed by color alone — every row carries an icon
 *   shape (check / dot / outline) and a screen-reader-only state
 *   qualifier so the stepper is still legible in high-contrast mode.
 */
export function WinningStatusStepper({
	currentStatus,
	actionSlot,
}: WinningStatusStepperProps) {
	const currentMainIndex = findMainPathIndex(currentStatus);
	const inDisputeBranch =
		currentStatus === WINNING_STATUS.DISPUTED ||
		currentStatus === WINNING_STATUS.RESOLVED;

	return (
		<div className="flex flex-col gap-4">
			<ol className="flex flex-col">
				{MAIN_PATH_STEPS.map(function renderMainStep(step, index) {
					const state = getMainStepState({
						index,
						currentMainIndex,
						inDisputeBranch,
					});
					const isLast = index === MAIN_PATH_STEPS.length - 1;
					// Mount the CTA under the active mainline step so the
					// button visually belongs to the action that advances it.
					// Skipped when the flow is in the dispute branch — the
					// dispute rows own the slot in that case.
					const rowAction =
						state === 'current' && !inDisputeBranch ? actionSlot : undefined;
					return (
						<StepRow
							key={step.status}
							label={getWinningStatusLabel(step.status)}
							description={step.description}
							state={state}
							showConnector={!isLast}
							action={rowAction}
						/>
					);
				})}
			</ol>

			{inDisputeBranch ? (
				<div className="flex flex-col gap-3 border-t border-black/10 pt-4">
					{/* Dispute label renders as a pill badge (rounded-full +
					    hairline border) rather than a bare uppercase line —
					    matches the brand's badge language elsewhere (browse
					    category chips, raffle status pills) so the branch
					    separator reads as an intentional state marker, not
					    a vestigial label. `self-start` stops the pill from
					    stretching to the column width. */}
					<span className="border-destructive/30 bg-destructive/10 text-destructive inline-flex items-center self-start rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">
						Dispute branch
					</span>
					<ol className="flex flex-col">
						{DISPUTE_BRANCH_STEPS.map(function renderDisputeStep(step, index) {
							const state = getDisputeStepState({
								status: step.status,
								currentStatus,
							});
							const isLast = index === DISPUTE_BRANCH_STEPS.length - 1;
							// The dispute branch only ever exposes admin CTAs, and
							// admins aren't viewers in the winner_chat, so `actionSlot`
							// for dispute rows will usually be undefined. Wired
							// through anyway so future viewer-side affordances (e.g.
							// "Withdraw dispute") can land without further changes.
							const rowAction = state === 'current' ? actionSlot : undefined;
							return (
								<StepRow
									key={step.status}
									label={getWinningStatusLabel(step.status)}
									description={step.description}
									state={state}
									showConnector={!isLast}
									variant="dispute"
									action={rowAction}
								/>
							);
						})}
					</ol>
				</div>
			) : null}
		</div>
	);
}

/** Visual state of a single row in the stepper. */
type StepState = 'completed' | 'current' | 'upcoming';

interface StepRowProps {
	readonly label: string;
	readonly description: string;
	readonly state: StepState;
	/** When false, the trailing vertical connector is omitted (last row). */
	readonly showConnector: boolean;
	/** Dispute rows tint the current marker with `destructive` tokens. */
	readonly variant?: 'mainline' | 'dispute';
	/**
	 * Optional CTA rendered below the description. Only supplied on the
	 * active row (see `WinningStatusStepper`) so the button visually
	 * anchors to "this is what unblocks this step".
	 */
	readonly action?: ReactNode;
}

/**
 * Single row: icon + connector column on the left, label + description
 * on the right. The text column carries `min-w-0` so long descriptions
 * wrap inside the flex container rather than pushing the rail off-
 * alignment on narrow viewports.
 */
function StepRow({
	label,
	description,
	state,
	showConnector,
	variant = 'mainline',
	action,
}: StepRowProps) {
	const isDispute = variant === 'dispute';
	return (
		<li
			aria-current={state === 'current' ? 'step' : undefined}
			className="flex items-start gap-3"
		>
			<div className="flex flex-col items-center self-stretch">
				<StepIcon state={state} isDispute={isDispute} />
				{showConnector ? (
					<span
						aria-hidden="true"
						className={cn(
							'mt-1 w-px flex-1',
							// Completed rail is softened to 60% primary so the
							// trail reads as a subtle "you were here" tint
							// rather than a solid black bar dominating the
							// panel. Upcoming rail stays on the faint border
							// token so it recedes.
							state === 'completed' ? 'bg-primary/60' : 'bg-border',
						)}
					/>
				) : null}
			</div>
			{/* `pb-4` acts as inter-row rhythm AND extends the icon column's
			    `self-stretch` height so the connector bridges the gap to the
			    next row. The last row in each list gates `showConnector=false`,
			    so dropping pb-4 there avoids a dead zone at the panel bottom.
			    Bumped from 3 → 4 so the rail has noticeable breath between
			    steps — at 3 the rows felt crammed against the panel's own
			    padding. */}
			<div
				className={cn(
					'flex min-w-0 flex-1 flex-col gap-1',
					showConnector && 'pb-4',
				)}
			>
				<span
					className={cn(
						'text-sm',
						// Current step reads a weight heavier than neighbors so
						// the squint test surfaces "where am I?" instantly —
						// space + icon + weight is a tighter hierarchy than
						// space + icon alone.
						state === 'current' ? 'font-semibold' : 'font-medium',
						state === 'upcoming' && 'text-foreground/55',
						state === 'current' &&
							(isDispute ? 'text-destructive' : 'text-foreground'),
					)}
				>
					{label}
					{state === 'completed' ? (
						<span className="sr-only"> (completed)</span>
					) : null}
					{state === 'current' ? (
						<span className="sr-only"> (current step)</span>
					) : null}
				</span>
				{/* Description is tinted foreground (not muted-foreground) so
				    it stays readable on the panel's cream-tinted background —
				    gray-on-color washes out, transparency on the foreground
				    hue keeps it brand-coherent and WCAG-safe. */}
				<span className="text-foreground/65 text-xs leading-snug">
					{description}
				</span>
				{/* Action CTA anchors the button directly to the step it
				    unblocks — `mt-3` keeps it visually separated from the
				    description without breaking the row's vertical rhythm. */}
				{action ? <div className="mt-3">{action}</div> : null}
			</div>
		</li>
	);
}

interface StepIconProps {
	readonly state: StepState;
	readonly isDispute: boolean;
}

/**
 * Marker shape for a step. Uses three distinct icon shapes so the state
 * is legible without color:
 * - completed → filled check badge
 * - current   → ringed dot (main) or warning triangle (dispute)
 * - upcoming  → hollow circle in a muted border
 */
function StepIcon({ state, isDispute }: StepIconProps) {
	if (state === 'completed') {
		return (
			<span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full">
				<Check aria-hidden="true" className="size-3" />
			</span>
		);
	}
	if (state === 'current') {
		return (
			<span
				className={cn(
					'flex size-5 shrink-0 items-center justify-center rounded-full ring-2',
					isDispute
						? 'bg-destructive/10 text-destructive ring-destructive/40'
						: 'bg-background text-primary ring-primary',
				)}
			>
				{isDispute ? (
					<AlertTriangle aria-hidden="true" className="size-3" />
				) : (
					<CircleDot aria-hidden="true" className="size-3" />
				)}
			</span>
		);
	}
	return (
		<span className="bg-background text-muted-foreground border-border flex size-5 shrink-0 items-center justify-center rounded-full border">
			<Circle aria-hidden="true" className="size-2" />
		</span>
	);
}

/**
 * Maps the raw current status to an index in `MAIN_PATH_STEPS`.
 *
 * - `pending_partial_fulfillment` collapses to the `pending` index —
 *   historic DB rows still render on the first step instead of falling
 *   off the rail.
 * - `disputed` / `resolved` return -1; the caller switches to the
 *   dispute branch layout via `inDisputeBranch` and treats all mainline
 *   steps as "completed" (the machine can only enter dispute from
 *   `sent`+, so the trail is always at least partially walked).
 * - Unknown tokens (future enum additions) default to `pending` so the
 *   stepper degrades gracefully instead of rendering a blank rail.
 */
function findMainPathIndex(status: WinningStatus): number {
	switch (status) {
		case WINNING_STATUS.PENDING:
		case WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT:
			return 0;
		case WINNING_STATUS.AWAITING_HOST:
			return 1;
		case WINNING_STATUS.SENT:
			return 2;
		case WINNING_STATUS.DELIVERED:
			return 3;
		case WINNING_STATUS.RECEIVED:
			return 4;
		case WINNING_STATUS.DISPUTED:
		case WINNING_STATUS.RESOLVED:
			return -1;
		default: {
			// Exhaustiveness guard — `satisfies never` breaks the build when
			// a new WinningStatus member slips in without a case above. The
			// runtime fallback keeps the stepper rendering (on the initial
			// step) for a deployment mismatch where the backend ships the
			// new enum before the client does.
			status satisfies never;
			return 0;
		}
	}
}

/**
 * Visual state for a mainline row.
 *
 * When the winning is in the dispute branch we still render the mainline
 * so the viewer sees how far the shipment got before the dispute
 * opened — every mainline row shows as "completed" because the state
 * machine can only reach `disputed` from `sent | delivered | received`.
 * Collapsing the entire mainline to completed keeps the surface honest
 * without carrying the pre-dispute step around separately (the chat
 * already has shipment_update messages for granular history).
 */
function getMainStepState(args: {
	readonly index: number;
	readonly currentMainIndex: number;
	readonly inDisputeBranch: boolean;
}): StepState {
	if (args.inDisputeBranch) return 'completed';
	if (args.index < args.currentMainIndex) return 'completed';
	if (args.index === args.currentMainIndex) return 'current';
	return 'upcoming';
}

/**
 * Visual state for a dispute-branch row. `disputed` becomes completed
 * once `resolved` is reached; otherwise the matching row is current and
 * the other is upcoming.
 */
function getDisputeStepState(args: {
	readonly status: WinningStatus;
	readonly currentStatus: WinningStatus;
}): StepState {
	if (args.status === args.currentStatus) return 'current';
	if (
		args.status === WINNING_STATUS.DISPUTED &&
		args.currentStatus === WINNING_STATUS.RESOLVED
	) {
		return 'completed';
	}
	return 'upcoming';
}
