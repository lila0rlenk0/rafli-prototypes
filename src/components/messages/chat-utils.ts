/**
 * Presentation helpers for the chat UI.
 *
 * Pure functions only — co-located tests live in `chat-utils.test.ts`.
 * The linkifier is the hot path for XSS defence: it's the ONLY place
 * raw message bodies produce anchor tags, so every protocol allow-list
 * decision is visible here.
 */

import {
	CONVERSATION_TYPE,
	type Conversation,
	type ConversationFilter,
	type ConversationMember,
	type ConversationSort,
} from '@/types/chat';

/** Roles surfaced in the UI — derived from conversation metadata + member row. */
export const VIEWER_ROLE = {
	HOST: 'host',
	WINNER: 'winner',
	STAFF: 'staff',
	MEMBER: 'member',
} as const;

export type ViewerRole = (typeof VIEWER_ROLE)[keyof typeof VIEWER_ROLE];

/**
 * URL regex — matches `http(s)://<non-whitespace>`. Anchor with `\b` so
 * words like `fetch("https://...")` still capture. Trailing punctuation
 * is stripped afterwards via `stripTrailingPunctuation` to avoid
 * swallowing sentence-ending characters into the link.
 *
 * Kept at module scope per `.claude/rules/code-style.md` (no per-render regex).
 */
const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/g;

/** Protocols we expand into clickable anchors. Anything else renders as text. */
const SAFE_URL_PROTOCOLS: readonly string[] = ['http://', 'https://'];

/** Trailing characters trimmed from a URL match — common sentence terminators. */
const TRAILING_PUNCT_REGEX = /[.,;:!?)\]}>"']+$/;

/**
 * One segment of a linkified message — either a plain-text run or a URL.
 * Rendered directly by `message-bubble.tsx`, which wraps the `link`
 * variant in an `<a>` with `rel="noopener noreferrer nofollow ugc"`.
 */
export interface LinkifySegment {
	readonly kind: 'text' | 'link';
	readonly value: string;
}

/**
 * Strips trailing sentence punctuation from a URL match so `see https://x.com.`
 * returns `https://x.com` instead of swallowing the period.
 */
function stripTrailingPunctuation(match: string): {
	url: string;
	trimmed: string;
} {
	const trimmedMatch = TRAILING_PUNCT_REGEX.exec(match);
	if (!trimmedMatch) return { url: match, trimmed: '' };
	return {
		url: match.slice(0, trimmedMatch.index),
		trimmed: trimmedMatch[0],
	};
}

/**
 * Splits a raw message body into alternating text / URL segments with an
 * explicit protocol allow-list. Callers render text segments verbatim
 * (React auto-escapes) and URL segments inside a safe-rel anchor.
 *
 * Why this belongs in pure code: the XSS posture depends on the allow-list
 * being exhaustive — unit tests lock it down and regressions fail CI.
 *
 * @param body - Raw user-authored message body (may be null for deleted / system messages).
 * @returns Segments ready for rendering.
 */
export function linkifyMessage(body: string | null): readonly LinkifySegment[] {
	if (!body) return [];

	const segments: LinkifySegment[] = [];
	let lastIndex = 0;

	URL_REGEX.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = URL_REGEX.exec(body)) !== null) {
		const rawMatch = match[0];
		const matchIndex = match.index;

		// Text run before the URL — preserve verbatim.
		if (matchIndex > lastIndex) {
			segments.push({ kind: 'text', value: body.slice(lastIndex, matchIndex) });
		}

		const { url, trimmed } = stripTrailingPunctuation(rawMatch);

		// Protocol re-check — the regex already requires `https?://` but we
		// verify here so a future regex change can't silently relax the
		// allow-list. This is the defensive-depth line between regex and
		// renderer.
		const hasSafeProtocol = SAFE_URL_PROTOCOLS.some(p => url.startsWith(p));
		if (hasSafeProtocol) {
			segments.push({ kind: 'link', value: url });
		} else {
			segments.push({ kind: 'text', value: url });
		}

		if (trimmed) {
			segments.push({ kind: 'text', value: trimmed });
		}

		lastIndex = matchIndex + rawMatch.length;
	}

	// Tail text after the last URL.
	if (lastIndex < body.length) {
		segments.push({ kind: 'text', value: body.slice(lastIndex) });
	}

	return segments;
}

/**
 * Derives the effective role for a member row.
 *
 * Priority: WINNER > HOST > STAFF > MEMBER. Winner wins even in non-
 * winner_chat rooms because it reflects a persistent platform state; host
 * wins over staff because the raffle host is always also a conversation
 * admin and we want the more specific label.
 *
 * Takes the member row directly so callers iterating `conversation.rosterMembers`
 * (e.g. the roster builder) don't redo an O(n) lookup per entry.
 *
 * @param conversation - Conversation the member belongs to.
 * @param member - Member row to classify.
 * @returns Role label.
 */
export function resolveMemberRole(
	conversation: Conversation,
	member: ConversationMember,
): ViewerRole {
	if (conversation.winnerUserId === member.userId) return VIEWER_ROLE.WINNER;
	if (conversation.createdBy === member.userId) return VIEWER_ROLE.HOST;
	return member.role === 'admin' ? VIEWER_ROLE.STAFF : VIEWER_ROLE.MEMBER;
}

/**
 * Derives the effective role a user plays in a conversation.
 *
 * @param conversation - Conversation to resolve against.
 * @param userId - Target user.
 * @returns Role label or null if the user is not a member.
 */
export function resolveViewerRole(
	conversation: Conversation,
	userId: string,
): ViewerRole | null {
	// Role inference is roster-driven only. This avoids inferring membership
	// from conversation type when the server intentionally strips roster
	// rows from non-member payloads.
	const member = conversation.rosterMembers.find(m => m.userId === userId);
	if (member) return resolveMemberRole(conversation, member);
	return null;
}

/** Short human label used in role-badge rendering. */
export function roleLabel(role: ViewerRole): string {
	switch (role) {
		case VIEWER_ROLE.HOST:
			return 'Host';
		case VIEWER_ROLE.WINNER:
			return 'Winner';
		case VIEWER_ROLE.STAFF:
			return 'Staff';
		case VIEWER_ROLE.MEMBER:
			return 'Member';
		default: {
			// Exhaustive narrowing for maintainability — TS will flag new enums.
			const _never: never = role;
			return _never;
		}
	}
}

/** Derives a one-line title for the conversation list and header. */
export function formatConversationTitle(conversation: Conversation): string {
	if (conversation.name) return conversation.name;
	// Prefer the server-enriched raffle title for raffle-scoped conversations
	// so the inbox distinguishes "Winner Chat · Vintage Watch" from
	// "Winner Chat · Gaming Console" at a glance instead of showing a
	// bank of identical "Winner Chat" rows.
	if (conversation.raffleTitle) return conversation.raffleTitle;
	switch (conversation.type) {
		case CONVERSATION_TYPE.WINNER_CHAT:
			return 'Winner chat';
		case CONVERSATION_TYPE.RAFFLE_ROOM:
			return 'Raffle room';
		case CONVERSATION_TYPE.GROUP:
			return 'Group';
		case CONVERSATION_TYPE.DIRECT:
			return 'Direct message';
		default: {
			const _never: never = conversation.type;
			return _never;
		}
	}
}

/**
 * One-line secondary label: who the conversation is with. For winner_chat
 * surfaces the winner — that's the handle both the host and the winner care
 * about when the inbox stacks multiple raffles. Returns null for all other
 * conversation types so the row keeps a compact two-line layout.
 *
 * We only render the denormalized `winnerDisplayName` — public username isn't
 * denormalized on the conversation row, and fetching it per-row would
 * reintroduce the N+1 the enrichment columns were designed to eliminate.
 */
export function formatConversationSubtitle(
	conversation: Conversation,
): string | null {
	if (conversation.type !== CONVERSATION_TYPE.WINNER_CHAT) return null;
	const name = conversation.winnerDisplayName?.trim();
	if (name) return `Winner: ${name}`;
	// winner_chat with no denormalized name — either the winner user was hard-
	// deleted or the conversation predates the denormalization backfill.
	return 'Winner';
}

/**
 * Formats a relative timestamp ("just now", "5m", "2h", "3d") — intentionally
 * coarse to avoid leaking precise activity windows that could be correlated
 * into a keystroke-timing side-channel.
 *
 * @param iso - ISO 8601 timestamp string.
 * @param now - Reference "now" in ms since epoch (default Date.now()). Exposed for tests.
 * @returns Coarse relative label.
 */
export function formatRelativeTime(
	iso: string,
	now: number = Date.now(),
): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';

	const diffMs = now - then;
	const diffSec = Math.max(0, Math.floor(diffMs / 1_000));
	if (diffSec < 45) return 'just now';
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h`;
	const diffDay = Math.floor(diffHr / 24);
	if (diffDay < 7) return `${diffDay}d`;
	const diffWk = Math.floor(diffDay / 7);
	return `${diffWk}w`;
}

/**
 * Trimmed display name for a conversation member, or null when the user
 * was hard-deleted, predates the backfill, or persisted as whitespace.
 *
 * Null-at-the-boundary keeps the "deleted" signal intact so the renderer
 * can style the fallback label (muted italic) without string-matching.
 *
 * @param member - Conversation member row.
 * @returns Trimmed name or null.
 */
export function memberDisplayName(member: ConversationMember): string | null {
	const trimmed = member.displayName?.trim();
	return trimmed ? trimmed : null;
}

/**
 * First whitespace-separated token of a display name.
 *
 * Used to mask staff members in the roster — host and winner own the prize-
 * coordination flow and surface with full names for clear accountability, but
 * staff are operators acting on behalf of the host so a first name is enough
 * to address them without leaking the operator's full identity into every
 * conversation they touch (the full name is still available on their profile
 * for participants who need it).
 *
 * Falls back to the original trimmed value when there's no whitespace — a
 * single-word handle like "amelia" stays as-is rather than becoming empty.
 *
 * @param name - Trimmed display name (caller guarantees non-empty).
 * @returns First token, or the original string when no whitespace is present.
 */
function firstNameToken(name: string): string {
	const spaceIndex = name.indexOf(' ');
	return spaceIndex === -1 ? name : name.slice(0, spaceIndex);
}

/** Sorted, viewer-excluded entry rendered by the participant roster. */
export interface RosterEntry {
	readonly member: ConversationMember;
	readonly role: ViewerRole;
	/** Null when the source display name was absent / blank — see `memberDisplayName`. */
	readonly displayName: string | null;
}

// Display order for the header roster. Host first because they're the
// organizer; winner second because the chat exists to coordinate their
// prize; staff and plain members trail. Co-located with `rosterEntries`
// so a reviewer reading the sort sees the rationale inline.
const ROSTER_ROLE_ORDER: Readonly<Record<ViewerRole, number>> = {
	[VIEWER_ROLE.HOST]: 0,
	[VIEWER_ROLE.WINNER]: 1,
	[VIEWER_ROLE.STAFF]: 2,
	[VIEWER_ROLE.MEMBER]: 3,
};

/**
 * Ordered roster entries for the chat header — viewer excluded, sorted
 * Host → Winner → Staff → Member, tie-broken by `joinedAt` ascending so
 * the rendered order is stable across refreshes.
 *
 * Pure: consumers memoize on the `conversation` reference alone.
 *
 * @param conversation - Conversation to enumerate.
 * @param viewerId - Current viewer — dropped from the output (their role
 *   is already surfaced by the header's viewer pill).
 * @returns Stable-ordered roster entries.
 */
export function rosterEntries(
	conversation: Conversation,
	viewerId: string,
): readonly RosterEntry[] {
	return conversation.rosterMembers
		.filter(m => m.userId !== viewerId)
		.map(member => {
			const role = resolveMemberRole(conversation, member);
			const fullName = memberDisplayName(member);
			// Staff identities get trimmed to first name only — see `firstNameToken`
			// for rationale. Null passes through so the "deleted user" fallback
			// still reaches the renderer.
			const displayName =
				role === VIEWER_ROLE.STAFF && fullName !== null
					? firstNameToken(fullName)
					: fullName;
			return { member, role, displayName };
		})
		.toSorted((a, b) => {
			const byRole = ROSTER_ROLE_ORDER[a.role] - ROSTER_ROLE_ORDER[b.role];
			if (byRole !== 0) return byRole;
			return a.member.joinedAt.localeCompare(b.member.joinedAt);
		});
}

/**
 * Distance (px) from the bottom of the scroll container below which the
 * auto-scroll heuristic treats the user as "at the bottom". Roughly two
 * message bubbles — wide enough to catch a short reply, tight enough that
 * someone reading history stays put.
 */
const AUTO_SCROLL_THRESHOLD_PX = 150;

export interface AutoScrollDecisionInput {
	/** True once we've performed the first auto-scroll for this conversation. */
	readonly firstScrollDone: boolean;
	/** Pixels between the viewport bottom and the scroll container bottom. */
	readonly distanceFromBottom: number;
	/** True when the store has at least one message to show. */
	readonly hasMessages: boolean;
}

/**
 * Decides whether a new message arrival should auto-scroll the viewport
 * to the bottom.
 *
 * Two legitimate triggers:
 *   - First non-empty render: the store stores messages ascending by id,
 *     so the newest bubble is at the bottom of the rendered list.
 *     Without forcing a scroll, the user lands at the OLDEST message —
 *     wrong for chat UX and the source of a recent regression.
 *   - Near the bottom already: the user is actively following the
 *     conversation. Yanking them down while they're scrolled up through
 *     history would be the single most annoying thing we can do.
 *
 * @param input - Current render state for the scroll container.
 * @returns `true` when the effect should set `scrollTop = scrollHeight`.
 */
export function shouldAutoScrollToBottom(
	input: AutoScrollDecisionInput,
): boolean {
	if (!input.hasMessages) return false;
	if (!input.firstScrollDone) return true;
	return input.distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX;
}

/**
 * Monogram from a display name. Same algorithm as the /profile section
 * (`personal-information-section.tsx`) so avatars read identically
 * across the app: first character of each space-separated word, joined,
 * capped at two glyphs, uppercased.
 *
 * @param name - Raw display name.
 * @returns Up to two uppercase characters; empty input yields "".
 */
export function avatarInitialFromName(name: string): string {
	return name
		.split(' ')
		.map(word => word[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

// =============================================================================
// Sidebar filter + sort — label helpers (server-driven, client only renders)
// =============================================================================
//
// Filter / search / sort happen server-side; the backend keyset paginates per
// sort mode (see `get-conversations.query.ts`) so slicing client-side would
// corrupt cursor boundaries. The helpers below translate the backend enum
// values into display labels and nothing else.

/** Display label per filter — used by the sidebar header chips. */
export function chatListFilterLabel(filter: ConversationFilter): string {
	switch (filter) {
		case 'all':
			return 'All';
		case 'unread':
			return 'Unread';
		case 'winners':
			return 'Winners';
		case 'raffles':
			return 'Raffles';
		default: {
			const _never: never = filter;
			return _never;
		}
	}
}

export function chatListSortLabel(sort: ConversationSort): string {
	switch (sort) {
		case 'recent':
			return 'Most recent';
		case 'oldest':
			return 'Oldest first';
		case 'unread_first':
			return 'Unread first';
		default: {
			const _never: never = sort;
			return _never;
		}
	}
}
