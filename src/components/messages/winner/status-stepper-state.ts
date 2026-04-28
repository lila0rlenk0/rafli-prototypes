import { WINNING_STATUS, type WinningStatus } from '@/types/winning';

/**
 * Visual state of a single row in the stepper. Three discriminated values
 * so the renderer can pick a distinct icon shape for each — never relying
 * on color alone (see status-stepper.tsx StepIcon for the visual mapping).
 */
export type StepState = 'completed' | 'current' | 'upcoming';

/**
 * Maps the raw current status to an index in the mainline step list.
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
 *
 * @param status - The current winning status from the state machine.
 * @returns Zero-based index into the mainline path, or -1 for dispute states.
 */
export function findMainPathIndex(status: WinningStatus): number {
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
 *
 * Terminal-happy carve-out: the last mainline step (`received`) has no
 * next actor — the flow is over. Painting it as `current` (ringed dot)
 * would borrow the "action pending here" affordance from in-flight steps
 * and contradict its own description ("Prize received. Case closed."),
 * so once we've reached the terminal index every row — including the
 * terminal one — collapses to `completed` (filled check). This mirrors
 * what we already do for the dispute branch above.
 *
 * `mainPathLength` is taken as a parameter (rather than reading a shared
 * constant) so this module stays decoupled from the renderer's step
 * descriptors — the caller is the source of truth for "how many steps
 * are on the rail" and tests can exercise the function with explicit
 * lengths instead of importing layout fixtures.
 *
 * @param args - Index of the row, the current step's index, mainline
 *   length, and whether the winning is in the dispute branch.
 * @returns The visual state for the row.
 */
export function getMainStepState(args: {
	readonly index: number;
	readonly currentMainIndex: number;
	readonly mainPathLength: number;
	readonly inDisputeBranch: boolean;
}): StepState {
	if (args.inDisputeBranch) return 'completed';
	const isTerminalHappyPath = args.currentMainIndex === args.mainPathLength - 1;
	if (isTerminalHappyPath) return 'completed';
	if (args.index < args.currentMainIndex) return 'completed';
	if (args.index === args.currentMainIndex) return 'current';
	return 'upcoming';
}

/**
 * Visual state for a dispute-branch row. `disputed` becomes completed
 * once `resolved` is reached; otherwise the matching row is current and
 * the other is upcoming.
 *
 * @param args - The row's status and the current status.
 * @returns The visual state for the row.
 */
export function getDisputeStepState(args: {
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
