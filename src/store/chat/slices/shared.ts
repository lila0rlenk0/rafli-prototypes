import type { Message } from '@/types/chat';

/**
 * Per-conversation message cap. Primarily a flood defence — an attacker
 * spamming messages would otherwise balloon memory. 1000 is large enough
 * that user-driven pagination (20 per page × 50 pages) never evicts rows
 * the user just loaded.
 */
export const MAX_MESSAGES_PER_CONVERSATION = 1_000;

/**
 * Inserts or replaces a message while preserving ascending id order.
 *
 * Messages are stored sorted by `id` because UUIDv7 ids are monotonically
 * time-ordered — the same order the UI wants to render (oldest at the top,
 * newest at the bottom). This lets pagination feeds (backwards-in-time)
 * and WS broadcasts (forwards-in-time) mix freely without a separate sort.
 *
 * Capped to `MAX_MESSAGES_PER_CONVERSATION` to bound memory against a
 * flooding adversary — evicts oldest rows so the visible window always
 * reflects the most recent activity.
 *
 * @returns A new array with `incoming` merged in order.
 */
export function mergeMessage(
	current: readonly Message[],
	incoming: Message,
): readonly Message[] {
	const existingIndex = current.findIndex(m => m.id === incoming.id);
	let next: Message[];
	if (existingIndex >= 0) {
		// Replace in place — edit/delete path. Preserves sort order because
		// the id (and therefore the position) is identical.
		next = current.slice();
		next[existingIndex] = incoming;
	} else {
		const insertIndex = current.findIndex(m => m.id > incoming.id);
		if (insertIndex === -1) {
			next = [...current, incoming];
		} else {
			next = [
				...current.slice(0, insertIndex),
				incoming,
				...current.slice(insertIndex),
			];
		}
	}

	if (next.length > MAX_MESSAGES_PER_CONVERSATION) {
		next = next.slice(next.length - MAX_MESSAGES_PER_CONVERSATION);
	}
	return next;
}

/**
 * Returns a copy of `obj` with `key` removed. Used instead of `delete` to
 * preserve immutability for Zustand shallow-compare selectors.
 *
 * @returns The object without `key`, or the same reference when absent.
 */
export function omitKey<V>(
	obj: Readonly<Record<string, V>>,
	key: string,
): Readonly<Record<string, V>> {
	if (!(key in obj)) return obj;
	// Shallow-clone then `delete` — the destructure-with-rest alternative
	// pulls in an unused binding for the extracted key, which trips the
	// zero-warning ESLint rule. `delete` on a freshly-owned clone is safe
	// and has the same observable behaviour.
	const next: Record<string, V> = { ...obj };
	delete next[key];
	return next;
}
