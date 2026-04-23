'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
	clearRaffleDraft,
	discardAbandonedDraft,
	hasAbandonedDraft,
	loadRaffleDraft,
	saveRaffleDraft,
	subscribeToRaffleDraft,
} from '@/lib/utils/raffle/raffle-draft-storage';
import type { RaffleDraftPayload } from '@/lib/validation/raffle/create-form-schema';

/**
 * SSR snapshot — localStorage is unavailable on the server, so returning
 * a constant null avoids hydration mismatches. `useSyncExternalStore`
 * then reads the live value after hydration.
 */
function getServerSnapshot(): RaffleDraftPayload | null {
	return null;
}

/** No-op subscribe used to drive the SSR-aware `isLoading` flag. */
function neverSubscribe(): () => void {
	return () => {};
}
function alwaysTrue(): true {
	return true;
}
function alwaysFalse(): false {
	return false;
}

/**
 * Custom hook wrapping raffle draft persistence. Subscribes to `storage`
 * events via `useSyncExternalStore` so the storage layer stays outside
 * React state and cross-tab mutations propagate without `setState` in an
 * effect (per `.claude/rules/react-effects.md`).
 *
 * `isLoading` is derived from a second `useSyncExternalStore` that
 * returns `false` on the server and `true` after hydration — this is
 * React's canonical "did I hydrate yet?" idiom and avoids the banned
 * `setState`-in-effect hydration pattern.
 *
 * @returns Draft, presence flag, save/clear mutators, and loading flag.
 */
export function useRaffleDraft() {
	const draft = useSyncExternalStore(
		subscribeToRaffleDraft,
		loadRaffleDraft,
		getServerSnapshot,
	);

	const didHydrate = useSyncExternalStore(
		neverSubscribe,
		alwaysTrue,
		alwaysFalse,
	);

	const saveDraft = useCallback(
		(data: Omit<RaffleDraftPayload, 'savedAt'>, currentStep: number) => {
			saveRaffleDraft(data, currentStep);
		},
		[],
	);

	const clearDraft = useCallback(() => {
		clearRaffleDraft();
	}, []);

	// Read-at-hydration rather than a store subscription — the abandoned
	// slot only changes via `loadRaffleDraft`'s failure branches (which
	// already ran before the form mounts) or `dismissAbandonedDraft`
	// below, so one read after hydration is sufficient. SSR returns false.
	const hasAbandoned = didHydrate && hasAbandonedDraft();

	const dismissAbandonedDraft = useCallback(() => {
		discardAbandonedDraft();
	}, []);

	return {
		draft,
		hasDraft: draft !== null,
		saveDraft,
		clearDraft,
		isLoading: !didHydrate,
		hasAbandonedDraft: hasAbandoned,
		dismissAbandonedDraft,
	};
}
