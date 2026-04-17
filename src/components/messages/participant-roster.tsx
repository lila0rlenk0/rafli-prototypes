'use client';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';

import { rosterEntries, type RosterEntry } from './chat-utils';
import { RoleBadge } from './role-badge';

/**
 * Max roster chips shown inline in the header. When the roster exceeds
 * this, we drop the last slot to an overflow button ("+N more") so the
 * header stays a single tight row regardless of membership size
 * (`maxMembers` can be up to 50 for group conversations).
 */
const MAX_INLINE_CHIPS = 3;

/** Placeholder rendered for members whose display name is null (deleted user / pre-backfill row). */
const DELETED_MEMBER_LABEL = 'Deleted user';

interface ParticipantRosterProps {
	readonly conversation: Conversation;
	readonly viewerId: string;
}

/**
 * Participant chips for the chat header — renders the other members'
 * names next to role badges, collapsing past `MAX_INLINE_CHIPS` into a
 * Popover triggered by a "+N more" button.
 *
 * Viewer is excluded because the header already surfaces their own role
 * on the right-hand pill (`RoleBadge`). Sort order is derived in
 * `rosterEntries` — the component stays rendering-only.
 */
export function ParticipantRoster({
	conversation,
	viewerId,
}: ParticipantRosterProps) {
	// `rosterEntries` is pure and O(n log n); `useMemo` avoids the sort on
	// unrelated header re-renders (e.g. status-pill online flips).
	const entries = useMemo(
		() => rosterEntries(conversation, viewerId),
		[conversation, viewerId],
	);

	// True "other participants" count — `memberCount` is authoritative for
	// raffle_room rooms where the roster is a capped slice of thousands, and
	// matches `entries.length` for small conversations. `-1` subtracts the
	// viewer, clamped at 0 so the single-viewer case doesn't render "-1".
	const otherCount = Math.max(0, conversation.memberCount - 1);

	if (otherCount === 0) {
		// Viewer is alone in the conversation — keeps the existing empty-state
		// copy from before the roster replaced the "X participants" line.
		return (
			<p className="text-muted-foreground truncate text-[11px]">
				Just you here for now
			</p>
		);
	}

	// Roster overflow has two sources:
	//   1. Inline-chip cap (`MAX_INLINE_CHIPS`) — when a small conversation
	//      has more participants than we can fit inline, we collapse the tail
	//      into a popover listing every other member.
	//   2. Server-side roster cap (ROSTER_CAP) — a raffle_room with 10k
	//      participants returns at most 50 roster entries. The popover can
	//      only show names we actually have, so the "+N more" label includes
	//      the unlisted tail count: `otherCount - visible.length`, which
	//      rolls up both sources.
	const hasHiddenEntries = entries.length > MAX_INLINE_CHIPS;
	const visible = hasHiddenEntries
		? entries.slice(0, MAX_INLINE_CHIPS - 1)
		: entries;
	const rosterHidden = hasHiddenEntries
		? entries.slice(MAX_INLINE_CHIPS - 1)
		: [];
	const unlistedCount = otherCount - visible.length - rosterHidden.length;
	const hasOverflow = rosterHidden.length > 0 || unlistedCount > 0;

	return (
		<ul
			className="flex flex-wrap items-center gap-x-2 gap-y-1"
			aria-label={`${otherCount} other participants`}
		>
			{visible.map(entry => (
				<RosterChip key={entry.member.userId} entry={entry} />
			))}
			{hasOverflow ? (
				<li>
					<OverflowPopover
						entries={rosterHidden}
						unlistedCount={unlistedCount}
					/>
				</li>
			) : null}
		</ul>
	);
}

/**
 * Single name-plus-badge chip. Caps very long names via `max-w-40`
 * (160px ≈ 24 chars of the 11px chat font) so one pathological 40-char
 * handle can't push the roster out of the header — realistic usernames
 * (`coolscorecard702`, `hardworkingbeneficiary331`) render in full, but
 * anything longer ellipsises with the native browser tooltip carrying
 * the whole string. Using the spacing-scale `max-w-40` rather than
 * `ch` units keeps the cap stable across weight/script changes (CJK
 * and emoji glyphs are wider than Latin so `ch` under-counts them).
 */
function RosterChip({ entry }: { readonly entry: RosterEntry }) {
	const isDeleted = entry.displayName === null;
	const label = entry.displayName ?? DELETED_MEMBER_LABEL;
	return (
		<li className="flex min-w-0 items-center gap-1 text-[11px]">
			<span
				className={cn(
					'max-w-40 truncate',
					isDeleted && 'text-muted-foreground italic',
				)}
				title={label}
			>
				{label}
			</span>
			<RoleBadge role={entry.role} size="xs" />
		</li>
	);
}

/**
 * Collapsed-overflow popover for rooms with more participants than the
 * inline cap. Popover over Sheet because 3–10 names with role chips is a
 * dropdown-shaped payload; a side sheet would eat the whole chat column
 * for what's essentially a short list.
 *
 * The trigger uses shadcn Button `size="sm"` (h-8) rather than a custom
 * tight sizing — matches the "Load older messages" button in the same
 * view for visual consistency and gives a reasonable tap target on
 * mobile. The extra vertical weight is acceptable: the overflow slot
 * appears only when there are 4+ participants, which is the minority of
 * winner-chat rooms.
 */
function OverflowPopover({
	entries,
	unlistedCount,
}: {
	readonly entries: readonly RosterEntry[];
	/**
	 * Participants we know are in the conversation (via `memberCount`) but
	 * didn't make it into the server's prioritized roster slice — relevant
	 * for raffle_room rooms where the slice caps at 50 and the true
	 * membership runs into the thousands. Rendered as a trailing "…and N
	 * more not listed" row so the total in the "+X more" trigger matches
	 * the header's participant count and doesn't quietly undercount.
	 */
	readonly unlistedCount: number;
}) {
	// Trigger count = everything the viewer can see below the inline cap,
	// plus the server-capped tail. Matches the header's `otherCount` label
	// arithmetic so the two never disagree.
	const triggerTotal = entries.length + unlistedCount;
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground text-[11px]"
					aria-label={`Show ${triggerTotal} more participants`}
				>
					+{triggerTotal} more
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-60 p-2">
				<ul className="flex flex-col" role="list">
					{entries.map(entry => (
						<OverflowItem key={entry.member.userId} entry={entry} />
					))}
					{unlistedCount > 0 ? (
						<li className="text-muted-foreground px-2 py-1.5 text-xs italic">
							+{unlistedCount} more not listed
						</li>
					) : null}
				</ul>
			</PopoverContent>
		</Popover>
	);
}

function OverflowItem({ entry }: { readonly entry: RosterEntry }) {
	const isDeleted = entry.displayName === null;
	const label = entry.displayName ?? DELETED_MEMBER_LABEL;
	return (
		<li className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs">
			{/* `min-w-0 flex-1` is load-bearing: flex items default to
			    `min-width: auto` (content-sized) which blocks `truncate` from
			    shrinking the name box — without it a 40-char handle would
			    push the role badge off the right edge of the popover. */}
			<span
				className={cn(
					'min-w-0 flex-1 truncate',
					isDeleted && 'text-muted-foreground italic',
				)}
				title={label}
			>
				{label}
			</span>
			<RoleBadge role={entry.role} size="xs" />
		</li>
	);
}
