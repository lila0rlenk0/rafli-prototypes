import { WINNING_STATUS } from '@/types/winning';

/**
 * Human-readable label map for every `WinningStatus` enum value.
 *
 * Single source of truth — any surface that renders a winning status
 * (badges, timelines, chat shipment_update messages) must route through
 * `getWinningStatusLabel` so copy stays consistent and a backend enum
 * rename can't silently leak a snake_case token into the UI.
 *
 * `pending_partial_fulfillment` is a legacy status still present in
 * historical DB rows — collapsed into "Pending" because the distinction
 * is a backend-only artifact.
 */
const WINNING_STATUS_LABEL: Readonly<Record<string, string>> = {
	[WINNING_STATUS.PENDING]: 'Pending',
	[WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT]: 'Pending',
	[WINNING_STATUS.AWAITING_HOST]: 'Awaiting host',
	[WINNING_STATUS.SENT]: 'Sent',
	[WINNING_STATUS.DELIVERED]: 'Delivered',
	[WINNING_STATUS.RECEIVED]: 'Received',
	[WINNING_STATUS.DISPUTED]: 'Disputed',
	[WINNING_STATUS.RESOLVED]: 'Resolved',
};

/**
 * Converts a winning status token into its human-readable label.
 *
 * Accepts `string` (not `WinningStatus`) because shipment_update chat
 * metadata from the backend is typed loosely as `z.string()` — an
 * unknown token from a newly-added backend enum must still render
 * readable text instead of leaking `awaiting_host` into the UI.
 *
 * Fallback path: replace underscores with spaces and capitalize the
 * first letter so a future enum value gracefully degrades to
 * "Some new status" rather than the raw token.
 *
 * @param status - Raw status token (from `WinningStatus` or shipment metadata).
 * @returns Localized, display-ready label.
 */
export function getWinningStatusLabel(status: string): string {
	const known = WINNING_STATUS_LABEL[status];
	if (known) return known;

	// Fallback: prettify unknown tokens so the UI never shows raw snake_case.
	const spaced = status.replace(/_/g, ' ').trim();
	if (spaced.length === 0) return status;
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
