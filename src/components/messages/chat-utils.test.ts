import { describe, expect, test } from 'bun:test';

import type { Conversation } from '@/types/chat';

import {
	avatarInitialFromName,
	formatConversationTitle,
	formatRelativeTime,
	linkifyMessage,
	otherMembers,
	resolveViewerRole,
	roleLabel,
	shouldAutoScrollToBottom,
	VIEWER_ROLE,
} from './chat-utils';

/** Minimal conversation factory — fills the required fields a test scenario omits. */
function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
	const base: Conversation = {
		createdAt: '2026-04-01T00:00:00Z',
		createdBy: 'host-user',
		id: 'convo-1',
		lastMessage: null,
		maxMembers: 10,
		members: [
			{ joinedAt: '2026-04-01T00:00:00Z', role: 'admin', userId: 'host-user' },
			{
				joinedAt: '2026-04-01T00:00:00Z',
				role: 'member',
				userId: 'winner-user',
			},
		],
		name: null,
		raffleId: 'raffle-1',
		type: 'winner_chat',
		updatedAt: '2026-04-01T00:00:00Z',
		winnerUserId: 'winner-user',
	};
	return { ...base, ...overrides };
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
			members: [
				{ joinedAt: 't', role: 'admin', userId: 'host-user' },
				{ joinedAt: 't', role: 'member', userId: 'winner-user' },
				{ joinedAt: 't', role: 'admin', userId: 'staff-user' },
			],
		});
		expect(resolveViewerRole(convo, 'staff-user')).toBe(VIEWER_ROLE.STAFF);
	});

	test('returns MEMBER for plain participants', () => {
		const convo = makeConversation({
			members: [
				{ joinedAt: 't', role: 'admin', userId: 'host-user' },
				{ joinedAt: 't', role: 'member', userId: 'winner-user' },
				{ joinedAt: 't', role: 'member', userId: 'lurker' },
			],
			winnerUserId: 'winner-user',
		});
		expect(resolveViewerRole(convo, 'lurker')).toBe(VIEWER_ROLE.MEMBER);
	});

	test('returns null when the user is not a member', () => {
		const convo = makeConversation();
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

	test('falls back by type when name is null', () => {
		expect(
			formatConversationTitle(makeConversation({ type: 'winner_chat' })),
		).toBe('Winner chat');
		expect(formatConversationTitle(makeConversation({ type: 'group' }))).toBe(
			'Group',
		);
		expect(formatConversationTitle(makeConversation({ type: 'direct' }))).toBe(
			'Direct message',
		);
		expect(
			formatConversationTitle(makeConversation({ type: 'raffle_room' })),
		).toBe('Raffle room');
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

describe('otherMembers', () => {
	test('excludes the viewer from the members list', () => {
		const convo = makeConversation();
		const result = otherMembers(convo, 'host-user');
		expect(result).toHaveLength(1);
		expect(result[0].userId).toBe('winner-user');
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
