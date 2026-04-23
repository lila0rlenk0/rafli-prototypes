import {
	raffleDraftSchema,
	type RaffleDraftPayload,
} from '@/lib/validation/raffle/create-form-schema';

/** localStorage key — stable across deploys; renaming abandons existing drafts. */
export const DRAFT_STORAGE_KEY = 'raffly-raffle-draft';

/**
 * Parallel key that holds a corrupt/unparseable draft so it is not lost when
 * `loadRaffleDraft` can't parse or validate the main slot (e.g. schema drift
 * after a deploy, half-flushed write during quota exhaustion). The form
 * surfaces a toast on mount so the user knows why the form is empty and can
 * contact support with a recoverable payload.
 */
export const ABANDONED_DRAFT_KEY = 'raffly-raffle-draft:bak';

/** Drafts expire after 7 days to avoid surfacing stale form state on return visits. */
const DRAFT_EXPIRATION_DAYS = 7;

/**
 * Memoized parse result. `useSyncExternalStore` requires the snapshot
 * function to return a stable reference when the underlying data has not
 * changed; re-running `JSON.parse(...)` on every read would produce a new
 * object per call and loop React forever. The cache is keyed by the raw
 * stored string so any mutation flows through to consumers on the next
 * `storage` event without stale data.
 */
let cachedRaw: string | null = null;
let cachedDraft: RaffleDraftPayload | null = null;

/**
 * Checks whether a draft's `savedAt` timestamp is older than the 7-day window.
 *
 * @returns True when the draft is beyond the expiration threshold.
 */
function isDraftExpired(savedAt: string): boolean {
	const savedDate = new Date(savedAt);
	const now = new Date();
	const diffDays =
		(now.getTime() - savedDate.getTime()) / (1_000 * 60 * 60 * 24);
	return diffDays >= DRAFT_EXPIRATION_DAYS;
}

/**
 * Safely removes the stored draft, swallowing permission errors from
 * private browsing or embedded WebViews. Also invalidates the parse cache
 * so subsequent reads see the purge.
 */
function safeRemove(): void {
	try {
		localStorage.removeItem(DRAFT_STORAGE_KEY);
	} catch {
		// SecurityError — draft was never persisted in this context.
	}
	cachedRaw = null;
	cachedDraft = null;
}

/**
 * Moves an unparseable draft into the abandoned slot instead of deleting it.
 *
 * Rationale: `loadRaffleDraft` used to call `safeRemove()` on any parse or
 * schema-validation failure, which silently nuked the user's in-progress
 * draft when `raffleDraftSchema` evolved across a deploy. Preserving the
 * raw string under `ABANDONED_DRAFT_KEY` keeps the data recoverable (by
 * support or a future migration) and lets the form surface a non-intrusive
 * toast so the user isn't left wondering why the form came up empty.
 *
 * @param raw - The corrupt raw JSON string pulled from `DRAFT_STORAGE_KEY`
 */
function preserveCorruptDraft(raw: string): void {
	try {
		// Best-effort: if this throws (quota), we still remove the main slot
		// below so we don't get stuck re-reading the bad blob on every load.
		localStorage.setItem(ABANDONED_DRAFT_KEY, raw);
	} catch {
		// Storage is full or read-only — swallow; the main-slot remove still happens.
	}
	try {
		localStorage.removeItem(DRAFT_STORAGE_KEY);
	} catch {
		// SecurityError — nothing to remove; cache invalidation below is still correct.
	}
	cachedRaw = null;
	cachedDraft = null;
}

/**
 * True iff a previous `loadRaffleDraft` call preserved a corrupt draft that
 * hasn't been discarded yet. Safe in SSR (returns false).
 */
export function hasAbandonedDraft(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		return localStorage.getItem(ABANDONED_DRAFT_KEY) !== null;
	} catch {
		return false;
	}
}

/**
 * Discards the abandoned-draft backup. Called after the form has surfaced
 * the "couldn't restore your last draft" notice so the toast fires once.
 */
export function discardAbandonedDraft(): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(ABANDONED_DRAFT_KEY);
	} catch {
		// SecurityError — nothing to discard.
	}
}

/**
 * Returns the currently persisted draft, memoized across reads with the
 * same raw payload. Discards expired or malformed entries on the fly and
 * returns null in SSR / restricted browser contexts.
 *
 * @returns Validated draft or null.
 */
export function loadRaffleDraft(): RaffleDraftPayload | null {
	if (typeof window === 'undefined') return null;

	let stored: string | null;
	try {
		stored = localStorage.getItem(DRAFT_STORAGE_KEY);
	} catch {
		return null;
	}

	if (stored === cachedRaw) return cachedDraft;

	cachedRaw = stored;
	if (stored === null) {
		cachedDraft = null;
		return null;
	}

	try {
		const parsed = JSON.parse(stored);
		const validated = raffleDraftSchema.safeParse(parsed);

		if (!validated.success) {
			// Preserve the raw blob at the backup slot instead of deleting it
			// — schema drift across deploys would otherwise silently erase
			// an in-progress draft with no recovery path (see P1 notes).
			console.warn('Invalid draft data, preserving backup slot');
			preserveCorruptDraft(stored);
			return null;
		}

		if (isDraftExpired(validated.data.savedAt)) {
			// True expiration — the draft is intentionally abandoned, not
			// corrupt. `safeRemove` is correct here; nothing to recover.
			console.warn('Draft expired, clearing localStorage');
			safeRemove();
			return null;
		}

		cachedDraft = validated.data;
		return cachedDraft;
	} catch (error) {
		// JSON.parse / unknown throw: raw blob may be salvageable by a
		// future migration — preserve instead of drop.
		console.error('Failed to load draft, preserving backup slot:', error);
		preserveCorruptDraft(stored);
		return null;
	}
}

/**
 * Persists a draft snapshot alongside the current step and a fresh
 * `savedAt` timestamp. Swallows quota/permission errors so the form keeps
 * working in private browsing and embedded WebViews.
 */
export function saveRaffleDraft(
	data: Omit<RaffleDraftPayload, 'savedAt'>,
	currentStep: number,
): void {
	if (typeof window === 'undefined') return;

	const draftData: RaffleDraftPayload = {
		...data,
		currentStep,
		savedAt: new Date().toISOString(),
	};

	try {
		const raw = JSON.stringify(draftData);
		localStorage.setItem(DRAFT_STORAGE_KEY, raw);
		// Refresh the cache in-place so same-tab reads see the new value
		// immediately; cross-tab reads flow through the `storage` event.
		cachedRaw = raw;
		cachedDraft = draftData;
	} catch (error) {
		console.error('Failed to save draft:', error);
	}
}

/**
 * Removes the persisted draft. Safe in SSR (no-op) and restricted browsing
 * contexts where `removeItem` itself throws `SecurityError`.
 */
export function clearRaffleDraft(): void {
	if (typeof window === 'undefined') return;
	safeRemove();
}

/**
 * Subscribes to cross-tab `storage` events so `useSyncExternalStore`
 * consumers re-render when another tab writes to the draft slot.
 *
 * Also includes `ABANDONED_DRAFT_KEY` so quarantine or discard in another
 * tab updates the abandoned-draft notice without relying on a separate
 * `DRAFT_STORAGE_KEY` event (e.g. discard only touches the backup slot).
 *
 * @returns Unsubscribe function suitable for `useSyncExternalStore`.
 */
export function subscribeToRaffleDraft(onChange: () => void): () => void {
	if (typeof window === 'undefined') return () => {};
	function handleStorage(event: StorageEvent) {
		if (
			event.key === DRAFT_STORAGE_KEY ||
			event.key === ABANDONED_DRAFT_KEY ||
			event.key === null
		) {
			onChange();
		}
	}
	window.addEventListener('storage', handleStorage);
	return () => window.removeEventListener('storage', handleStorage);
}
