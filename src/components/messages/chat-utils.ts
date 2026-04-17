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
	type ConversationMemberRole,
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
 * Derives the effective role a user plays in a conversation.
 *
 * Priority order matters — a raffle host who happens to be a conversation
 * admin is still surfaced as HOST, not STAFF. A winner who lurks in a
 * second conversation still surfaces as MEMBER in that other conversation
 * because `winnerUserId` is scoped to the conversation passed in.
 *
 * @param conversation - Conversation to resolve against.
 * @param userId - Target user.
 * @returns Role label or null if the user is not a member.
 */
export function resolveViewerRole(
	conversation: Conversation,
	userId: string,
): ViewerRole | null {
	const member = conversation.members.find(m => m.userId === userId);
	if (!member) return null;

	// Winner short-circuits even for non-winner_chat rooms — a winner badge
	// reflects a persistent platform state, not the conversation's purpose.
	if (conversation.winnerUserId === userId) return VIEWER_ROLE.WINNER;

	// Host precedence over STAFF: the raffle host is the `createdBy` user
	// for winner_chat rooms, and we want HOST shown even if they also hold
	// the conversation `admin` role (which they always do).
	if (conversation.createdBy === userId) return VIEWER_ROLE.HOST;

	// Remaining admin-role members are platform staff who were added as
	// moderators after the fact (e.g. during a dispute escalation).
	return member.role === 'admin' ? VIEWER_ROLE.STAFF : VIEWER_ROLE.MEMBER;
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

/** Members list excluding the viewer — used to render the participants panel. */
export function otherMembers(
	conversation: Conversation,
	viewerId: string,
): ReadonlyArray<{
	readonly userId: string;
	readonly role: ConversationMemberRole;
}> {
	return conversation.members.filter(m => m.userId !== viewerId);
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
