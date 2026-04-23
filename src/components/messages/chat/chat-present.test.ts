import { describe, expect, test } from 'bun:test';

import type { Conversation } from '@/types/chat';

import {
	avatarInitialFromName,
	chatListFilterLabel,
	chatListSortLabel,
	formatConversationSubtitle,
	formatConversationTitle,
	formatRelativeTime,
	linkifyMessage,
	memberDisplayName,
	resolveMemberRole,
	resolveViewerRole,
	roleLabel,
	rosterEntries,
	shouldAutoScrollToBottom,
	VIEWER_ROLE,
} from './chat-present';

/**
 * Minimal conversation factory — fills the required fields a test scenario omits.
 *
 * `memberCount` defaults to `rosterMembers.length` after overrides are merged,
 * so unit tests that only care about roster semantics don't need to maintain
 * a parallel count. Tests that exercise the "raffle_room slice ≠ full count"
 * contract override `memberCount` explicitly.
 */
function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
	const base: Omit<Conversation, 'memberCount'> = {
		createdAt: '2026-04-01T00:00:00Z',
		createdBy: 'host-user',
		id: 'convo-1',
		lastMessage: null,
		maxMembers: 10,
		rosterMembers: [
			{
				displayName: 'Host Person',
				joinedAt: '2026-04-01T00:00:00Z',
				role: 'admin',
				userId: 'host-user',
			},
			{
				displayName: 'Ada Lovelace',
				joinedAt: '2026-04-01T00:00:00Z',
				role: 'member',
				userId: 'winner-user',
			},
		],
		name: null,
		raffleId: 'raffle-1',
		raffleTitle: 'Vintage Watch Giveaway',
		type: 'winner_chat',
		updatedAt: '2026-04-01T00:00:00Z',
		winnerDisplayName: 'Ada Lovelace',
		winnerEmail: 'ada@example.com',
		winnerUserId: 'winner-user',
	};
	const merged = { ...base, ...overrides };
	return {
		...merged,
		memberCount: overrides.memberCount ?? merged.rosterMembers.length,
	};
}

describe('linkifyMessage', () => {
	describe('allow-listed protocols', () => {
		test('expands a bare https URL into a single link segment', () => {
			const result = linkifyMessage('see https://example.com');
			expect(result).toEqual([
				{ kind: 'text', value: 'see ' },
				{ kind: 'link', value: 'https://example.com' },
			]);
		});

		test('expands http (plain) in case backends legitimately use it', () => {
			// Backends return https in production, but attacker messages could
			// include http — rendering them as text would be stricter but
			// confusing. Allow-list explicitly lists both protocols.
			const result = linkifyMessage('http://example.com');
			expect(result).toEqual([{ kind: 'link', value: 'http://example.com' }]);
		});

		test('strips trailing punctuation from the URL', () => {
			const result = linkifyMessage('check https://example.com.');
			expect(result).toEqual([
				{ kind: 'text', value: 'check ' },
				{ kind: 'link', value: 'https://example.com' },
				{ kind: 'text', value: '.' },
			]);
		});

		test('handles multiple URLs in one message', () => {
			const result = linkifyMessage('https://a.com and https://b.com');
			expect(result).toEqual([
				{ kind: 'link', value: 'https://a.com' },
				{ kind: 'text', value: ' and ' },
				{ kind: 'link', value: 'https://b.com' },
			]);
		});
	});

	describe('denied protocols', () => {
		test('does NOT linkify javascript:', () => {
			// Regression for CVE-2024-like UI-XSS via anchor tag href.
			const result = linkifyMessage('click javascript:alert(1)');
			expect(result.every(s => s.kind === 'text')).toBe(true);
		});

		test('does NOT linkify data:', () => {
			const result = linkifyMessage(
				'click data:text/html,<script>alert(1)</script>',
			);
			expect(result.every(s => s.kind === 'text')).toBe(true);
		});

		test('does NOT linkify vbscript:', () => {
			const result = linkifyMessage('click vbscript:msgbox(1)');
			expect(result.every(s => s.kind === 'text')).toBe(true);
		});

		test('does NOT linkify file://', () => {
			const result = linkifyMessage('file:///etc/passwd');
			expect(result.every(s => s.kind === 'text')).toBe(true);
		});
	});

	describe('edge cases', () => {
		test('empty body returns no segments', () => {
			expect(linkifyMessage('')).toEqual([]);
		});

		test('null body returns no segments', () => {
			expect(linkifyMessage(null)).toEqual([]);
		});

		test('plain text body is one segment', () => {
			expect(linkifyMessage('hello world')).toEqual([
				{ kind: 'text', value: 'hello world' },
			]);
		});

		test('HTML-like characters render as text (no XSS)', () => {
			const attack = '<script>alert(1)</script>';
			expect(linkifyMessage(attack)).toEqual([{ kind: 'text', value: attack }]);
		});
	});
});

describe('resolveViewerRole', () => {
	test('returns WINNER when userId matches winnerUserId', () => {
		const convo = makeConversation();
		expect(resolveViewerRole(convo, 'winner-user')).toBe(VIEWER_ROLE.WINNER);
	});

	test('returns HOST when userId matches createdBy', () => {
		const convo = makeConversation();
		expect(resolveViewerRole(convo, 'host-user')).toBe(VIEWER_ROLE.HOST);
	});

	test('returns STAFF for admin-role members who are neither host nor winner', () => {
		// Regression: we must only apply STAFF after host/winner checks so
		// the raffle host (who is always role:admin) isn't misidentified.
		const convo = makeConversation({
			rosterMembers: [
				{ displayName: 'H', joinedAt: 't', role: 'admin', userId: 'host-user' },
				{
					displayName: 'W',
					joinedAt: 't',
					role: 'member',
					userId: 'winner-user',
				},
				{
					displayName: 'S',
					joinedAt: 't',
					role: 'admin',
					userId: 'staff-user',
				},
			],
		});
		expect(resolveViewerRole(convo, 'staff-user')).toBe(VIEWER_ROLE.STAFF);
	});

	test('returns MEMBER for plain participants', () => {
		const convo = makeConversation({
			rosterMembers: [
				{ displayName: 'H', joinedAt: 't', role: 'admin', userId: 'host-user' },
				{
					displayName: 'W',
					joinedAt: 't',
					role: 'member',
					userId: 'winner-user',
				},
				{ displayName: 'L', joinedAt: 't', role: 'member', userId: 'lurker' },
			],
			winnerUserId: 'winner-user',
		});
		expect(resolveViewerRole(convo, 'lurker')).toBe(VIEWER_ROLE.MEMBER);
	});

	test('returns null when the user is not a member', () => {
		const convo = makeConversation();
		expect(resolveViewerRole(convo, 'stranger')).toBeNull();
	});

	test('returns null for roster-missing raffle_room viewers', () => {
		// Contract hardening: role inference must come from explicit roster
		// membership only. Inferring MEMBER from conversation type leaks a
		// role badge to any viewer of a roster-stripped payload.
		const convo = makeConversation({
			createdBy: 'host-user',
			rosterMembers: [
				{ displayName: 'H', joinedAt: 't', role: 'admin', userId: 'host-user' },
			],
			memberCount: 9_876,
			type: 'raffle_room',
			winnerUserId: null,
		});
		expect(resolveViewerRole(convo, 'bottom-ranked-user')).toBeNull();
	});

	test('still returns null for non-raffle_room conversations when the user is absent', () => {
		// Regression guard: the raffle_room fallback MUST NOT leak into
		// winner_chat / group / direct lookups, where an absent user is
		// genuinely a non-member and a null role is the correct answer.
		const convo = makeConversation({ type: 'winner_chat' });
		expect(resolveViewerRole(convo, 'stranger')).toBeNull();
	});
});

describe('roleLabel', () => {
	test('produces the expected labels', () => {
		expect(roleLabel(VIEWER_ROLE.HOST)).toBe('Host');
		expect(roleLabel(VIEWER_ROLE.WINNER)).toBe('Winner');
		expect(roleLabel(VIEWER_ROLE.STAFF)).toBe('Staff');
		expect(roleLabel(VIEWER_ROLE.MEMBER)).toBe('Member');
	});
});

describe('formatConversationTitle', () => {
	test('uses the backend-provided name when set', () => {
		expect(
			formatConversationTitle(
				makeConversation({ name: 'Cool raffle winners' }),
			),
		).toBe('Cool raffle winners');
	});

	test('prefers the server-enriched raffleTitle over the generic type label', () => {
		// Raffle title disambiguates overlapping winner_chat rows — that's the
		// whole reason the enrichment exists, so it must win over the
		// type-based fallback.
		expect(
			formatConversationTitle(
				makeConversation({
					type: 'winner_chat',
					raffleTitle: 'Limited Sneakers Drop',
				}),
			),
		).toBe('Limited Sneakers Drop');
	});

	test('falls back by type when name and raffleTitle are null', () => {
		expect(
			formatConversationTitle(
				makeConversation({ type: 'winner_chat', raffleTitle: null }),
			),
		).toBe('Winner chat');
		expect(
			formatConversationTitle(
				makeConversation({ type: 'group', raffleTitle: null }),
			),
		).toBe('Group');
		expect(
			formatConversationTitle(
				makeConversation({ type: 'direct', raffleTitle: null }),
			),
		).toBe('Direct message');
		expect(
			formatConversationTitle(
				makeConversation({ type: 'raffle_room', raffleTitle: null }),
			),
		).toBe('Sweepstakes room');
	});
});

describe('formatConversationSubtitle', () => {
	test('returns null for non-winner_chat conversations', () => {
		// Direct / group / raffle_room rows keep the two-line layout; a
		// subtitle would push the last-message preview out of view.
		expect(
			formatConversationSubtitle(makeConversation({ type: 'direct' })),
		).toBeNull();
		expect(
			formatConversationSubtitle(makeConversation({ type: 'group' })),
		).toBeNull();
		expect(
			formatConversationSubtitle(makeConversation({ type: 'raffle_room' })),
		).toBeNull();
	});

	test('winner_chat with a display name renders "Winner: <name>"', () => {
		expect(
			formatConversationSubtitle(
				makeConversation({
					type: 'winner_chat',
					winnerDisplayName: 'Ada Lovelace',
				}),
			),
		).toBe('Winner: Ada Lovelace');
	});

	test('winner_chat with only whitespace in winnerDisplayName falls back to generic label', () => {
		// Guards against backend rows where the enrichment column holds an
		// accidental whitespace string — the UI would otherwise render
		// "Winner:   " which looks broken.
		expect(
			formatConversationSubtitle(
				makeConversation({
					type: 'winner_chat',
					winnerDisplayName: '   ',
				}),
			),
		).toBe('Winner');
	});

	test('winner_chat without a display name falls back to generic "Winner"', () => {
		// Backfill gap / deleted winner user — keep the subtitle as a
		// role hint so the row layout stays stable.
		expect(
			formatConversationSubtitle(
				makeConversation({
					type: 'winner_chat',
					winnerDisplayName: null,
				}),
			),
		).toBe('Winner');
	});
});

describe('formatRelativeTime', () => {
	const REF_NOW = new Date('2026-04-16T12:00:00Z').getTime();

	test('< 45s renders as "just now"', () => {
		expect(formatRelativeTime('2026-04-16T11:59:30Z', REF_NOW)).toBe(
			'just now',
		);
	});

	test('minute precision under 1h', () => {
		expect(formatRelativeTime('2026-04-16T11:45:00Z', REF_NOW)).toBe('15m');
	});

	test('hour precision under 24h', () => {
		expect(formatRelativeTime('2026-04-16T09:00:00Z', REF_NOW)).toBe('3h');
	});

	test('day precision under 7d', () => {
		expect(formatRelativeTime('2026-04-14T12:00:00Z', REF_NOW)).toBe('2d');
	});

	test('week precision beyond 7d', () => {
		expect(formatRelativeTime('2026-04-01T12:00:00Z', REF_NOW)).toBe('2w');
	});

	test('invalid date renders as empty string', () => {
		expect(formatRelativeTime('not-a-date', REF_NOW)).toBe('');
	});
});

describe('resolveMemberRole', () => {
	// Twin of `resolveViewerRole` but takes the member row directly — avoids
	// a redundant `find` when the caller already iterates members (roster).
	test('winner short-circuits host and staff precedence', () => {
		const convo = makeConversation({
			createdBy: 'winner-user',
			winnerUserId: 'winner-user',
		});
		const winner = convo.rosterMembers.find(m => m.userId === 'winner-user')!;
		expect(resolveMemberRole(convo, winner)).toBe(VIEWER_ROLE.WINNER);
	});

	test('host precedence over staff when an admin is also createdBy', () => {
		const convo = makeConversation();
		const host = convo.rosterMembers.find(m => m.userId === 'host-user')!;
		expect(resolveMemberRole(convo, host)).toBe(VIEWER_ROLE.HOST);
	});

	test('admin-role non-host non-winner is staff', () => {
		const convo = makeConversation({
			rosterMembers: [
				{ displayName: 'H', joinedAt: 't', role: 'admin', userId: 'host-user' },
				{
					displayName: 'S',
					joinedAt: 't',
					role: 'admin',
					userId: 'staff-user',
				},
			],
			winnerUserId: null,
		});
		const staff = convo.rosterMembers.find(m => m.userId === 'staff-user')!;
		expect(resolveMemberRole(convo, staff)).toBe(VIEWER_ROLE.STAFF);
	});

	test('member-role non-host non-winner is plain member', () => {
		const convo = makeConversation({
			rosterMembers: [
				{ displayName: 'H', joinedAt: 't', role: 'admin', userId: 'host-user' },
				{ displayName: 'L', joinedAt: 't', role: 'member', userId: 'lurker' },
			],
			winnerUserId: null,
		});
		const lurker = convo.rosterMembers.find(m => m.userId === 'lurker')!;
		expect(resolveMemberRole(convo, lurker)).toBe(VIEWER_ROLE.MEMBER);
	});
});

describe('memberDisplayName', () => {
	test('returns the trimmed display name when populated', () => {
		expect(
			memberDisplayName({
				displayName: '  Kate  ',
				joinedAt: 't',
				role: 'admin',
				userId: 'u',
			}),
		).toBe('Kate');
	});

	test('returns null when displayName is null (hard-deleted user)', () => {
		// Null signals "no name to render" — the roster renders a muted
		// "Deleted user" fallback rather than swallowing the row.
		expect(
			memberDisplayName({
				displayName: null,
				joinedAt: 't',
				role: 'member',
				userId: 'u',
			}),
		).toBeNull();
	});

	test('returns null when displayName is whitespace-only', () => {
		// Guards against backfill rows that persisted an accidental blank —
		// the UI treats them like the deleted case rather than rendering a
		// zero-width chip.
		expect(
			memberDisplayName({
				displayName: '   ',
				joinedAt: 't',
				role: 'member',
				userId: 'u',
			}),
		).toBeNull();
	});
});

describe('rosterEntries', () => {
	// Sorted, viewer-excluded list consumed by ParticipantRoster.
	// Display order is Host → Winner → Staff → Member, tie-broken by joinedAt
	// ascending so the roster order is stable across renders.
	test('excludes the viewer from the list', () => {
		const convo = makeConversation();
		const entries = rosterEntries(convo, 'host-user');
		expect(entries.every(e => e.member.userId !== 'host-user')).toBe(true);
	});

	test('orders Host → Winner → Staff → Member', () => {
		const convo = makeConversation({
			createdBy: 'host-user',
			rosterMembers: [
				{
					displayName: 'Maya',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'member',
					userId: 'member-user',
				},
				{
					displayName: 'Sam',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'admin',
					userId: 'staff-user',
				},
				{
					displayName: 'Ada',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'member',
					userId: 'winner-user',
				},
				{
					displayName: 'Kate',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'admin',
					userId: 'host-user',
				},
			],
			winnerUserId: 'winner-user',
		});
		const entries = rosterEntries(convo, 'viewer-id');
		expect(entries.map(e => e.role)).toEqual([
			VIEWER_ROLE.HOST,
			VIEWER_ROLE.WINNER,
			VIEWER_ROLE.STAFF,
			VIEWER_ROLE.MEMBER,
		]);
	});

	test('tie-breaks within a role by joinedAt ascending', () => {
		// Two staff joined at different times — earlier joiner renders first
		// so the roster order is stable across refreshes.
		const convo = makeConversation({
			createdBy: 'somebody-else',
			rosterMembers: [
				{
					displayName: 'Late',
					joinedAt: '2026-04-03T00:00:00Z',
					role: 'admin',
					userId: 'staff-late',
				},
				{
					displayName: 'Early',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'admin',
					userId: 'staff-early',
				},
			],
			winnerUserId: null,
		});
		const entries = rosterEntries(convo, 'viewer-id');
		expect(entries.map(e => e.member.userId)).toEqual([
			'staff-early',
			'staff-late',
		]);
	});

	test('exposes displayName as null for deleted users instead of a fallback string', () => {
		// Keeping the null semantics at the boundary lets the component
		// distinguish "real name" from "fallback label" for styling (italic
		// muted) without string-matching on "Deleted user".
		const convo = makeConversation({
			createdBy: 'somebody-else',
			rosterMembers: [
				{
					displayName: null,
					joinedAt: 't',
					role: 'member',
					userId: 'ghost',
				},
			],
			winnerUserId: null,
		});
		const entries = rosterEntries(convo, 'viewer-id');
		expect(entries).toHaveLength(1);
		expect(entries[0]?.displayName).toBeNull();
	});

	test('keeps only the first name for staff members', () => {
		// Staff surface in the roster via a first-name-only label — see
		// `firstNameToken` in chat-present for the rationale. Host, winner, and
		// plain members keep their full name so the mask is role-specific.
		const convo = makeConversation({
			createdBy: 'host-user',
			rosterMembers: [
				{
					displayName: 'Kate Owens',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'admin',
					userId: 'host-user',
				},
				{
					displayName: 'Ada Lovelace',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'member',
					userId: 'winner-user',
				},
				{
					displayName: 'Sam Carter',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'admin',
					userId: 'staff-user',
				},
				{
					displayName: 'Maya Rodriguez',
					joinedAt: '2026-04-01T00:00:00Z',
					role: 'member',
					userId: 'member-user',
				},
			],
			winnerUserId: 'winner-user',
		});
		const entries = rosterEntries(convo, 'viewer-id');
		const byUserId = new Map(entries.map(e => [e.member.userId, e]));
		expect(byUserId.get('staff-user')?.displayName).toBe('Sam');
		// Full name retained for host / winner / member — the mask is scoped
		// to staff so reviewers reading the test see the boundary explicitly.
		expect(byUserId.get('host-user')?.displayName).toBe('Kate Owens');
		expect(byUserId.get('winner-user')?.displayName).toBe('Ada Lovelace');
		expect(byUserId.get('member-user')?.displayName).toBe('Maya Rodriguez');
	});

	test('leaves a single-token staff name intact instead of emptying it', () => {
		// `firstNameToken` falls back to the original string when there's no
		// whitespace — a mononym handle must not collapse to empty.
		const convo = makeConversation({
			createdBy: 'somebody-else',
			rosterMembers: [
				{
					displayName: 'amelia',
					joinedAt: 't',
					role: 'admin',
					userId: 'staff-user',
				},
			],
			winnerUserId: null,
		});
		const entries = rosterEntries(convo, 'viewer-id');
		expect(entries[0]?.displayName).toBe('amelia');
	});

	test('preserves null for deleted staff so the fallback label still renders', () => {
		// Null must propagate through the staff mask — otherwise the renderer
		// would show an empty chip instead of the "Deleted user" placeholder.
		const convo = makeConversation({
			createdBy: 'somebody-else',
			rosterMembers: [
				{
					displayName: null,
					joinedAt: 't',
					role: 'admin',
					userId: 'ghost-staff',
				},
			],
			winnerUserId: null,
		});
		const entries = rosterEntries(convo, 'viewer-id');
		expect(entries[0]?.displayName).toBeNull();
		expect(entries[0]?.role).toBe(VIEWER_ROLE.STAFF);
	});

	test('returns an empty list when the viewer is the only member', () => {
		const convo = makeConversation({
			createdBy: 'viewer-id',
			rosterMembers: [
				{
					displayName: 'Me',
					joinedAt: 't',
					role: 'admin',
					userId: 'viewer-id',
				},
			],
			winnerUserId: null,
		});
		expect(rosterEntries(convo, 'viewer-id')).toEqual([]);
	});
});

describe('shouldAutoScrollToBottom', () => {
	// Regression: initial mount used to evaluate only the distance-from-bottom
	// heuristic. Messages are stored ascending by id, so a 20-row hydrate
	// lands with scrollTop=0 and the user sees the OLDEST message first —
	// wrong for a chat UI, where the newest row is expected at the bottom.
	test('always scrolls on first non-empty render even when far from bottom', () => {
		expect(
			shouldAutoScrollToBottom({
				firstScrollDone: false,
				distanceFromBottom: 5_000,
				hasMessages: true,
			}),
		).toBe(true);
	});

	test('does not scroll on first render when there are no messages yet', () => {
		// Empty initial paint must not trigger a scroll — the effect would
		// re-fire once messages hydrate and perform the real scroll then.
		expect(
			shouldAutoScrollToBottom({
				firstScrollDone: false,
				distanceFromBottom: 0,
				hasMessages: false,
			}),
		).toBe(false);
	});

	test('scrolls when the user is already near the bottom', () => {
		expect(
			shouldAutoScrollToBottom({
				firstScrollDone: true,
				distanceFromBottom: 100,
				hasMessages: true,
			}),
		).toBe(true);
	});

	test('does not scroll when the user is reading history (far from bottom)', () => {
		// Yanking the viewport down mid-scroll is the single most annoying
		// chat-UX regression — guard it with a test.
		expect(
			shouldAutoScrollToBottom({
				firstScrollDone: true,
				distanceFromBottom: 800,
				hasMessages: true,
			}),
		).toBe(false);
	});

	test('scrolls exactly at the 150px threshold boundary (inclusive)', () => {
		// The threshold is roughly two message bubbles — treated as inclusive
		// so a short reply still auto-scrolls when the user is one bubble up.
		expect(
			shouldAutoScrollToBottom({
				firstScrollDone: true,
				distanceFromBottom: 150,
				hasMessages: true,
			}),
		).toBe(true);
	});

	test('treats negative distances (overscroll bounce) as at-the-bottom', () => {
		// Safari's rubber-band scroll briefly reports scrollTop > scrollHeight
		// on the iOS keyboard open, yielding a negative distance. Must still
		// auto-scroll so a new bubble doesn't vanish below the keyboard.
		expect(
			shouldAutoScrollToBottom({
				firstScrollDone: true,
				distanceFromBottom: -20,
				hasMessages: true,
			}),
		).toBe(true);
	});
});

describe('avatarInitialFromName', () => {
	// Algorithm mirrors `personal-information-section.tsx` so the chat
	// avatar reads identically to the /profile section.

	test('single-word name yields its first letter uppercased', () => {
		expect(avatarInitialFromName('zebra')).toBe('Z');
	});

	test('multi-word name concatenates first chars, capped at two', () => {
		expect(avatarInitialFromName('Jane Cooper')).toBe('JC');
	});

	test('three-word input keeps only the first two initials', () => {
		expect(avatarInitialFromName('Mary Jane Cooper')).toBe('MJ');
	});

	test('preserves unicode letters (accented + non-Latin)', () => {
		expect(avatarInitialFromName('Álvaro Ñoño')).toBe('ÁÑ');
	});

	test('empty input yields empty string (no letter to display)', () => {
		expect(avatarInitialFromName('')).toBe('');
	});
});

describe('chatListFilterLabel', () => {
	test('renders the expected chip labels', () => {
		// Locked in so a rename has to touch the test too — the labels are
		// part of the public sidebar contract and translated strings live
		// next to them in the i18n file when that gets wired.
		expect(chatListFilterLabel('all')).toBe('All');
		expect(chatListFilterLabel('unread')).toBe('Unread');
	});
});

describe('chatListSortLabel', () => {
	test('renders the expected sort labels', () => {
		expect(chatListSortLabel('recent')).toBe('Most recent');
		expect(chatListSortLabel('oldest')).toBe('Oldest first');
		expect(chatListSortLabel('unread_first')).toBe('Unread first');
	});
});
