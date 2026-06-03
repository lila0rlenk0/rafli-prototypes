'use client';

import { useSyncExternalStore } from 'react';

import {
	MOCK_STATE_COOKIE,
	MOCK_STATE_LABELS,
	MOCK_STATES,
	type MockState,
} from '@/types/mock-preview';

const DEFAULT_STATE: MockState = 'guest';

/**
 * Reads the current mock state from `document.cookie`.
 *
 * @returns The active mock state, or the guest default when unset
 */
function readCookieState(): MockState {
	const match = document.cookie
		.split('; ')
		.find(row => row.startsWith(`${MOCK_STATE_COOKIE}=`));
	const value = match?.split('=')[1];
	return MOCK_STATES.includes(value as MockState)
		? (value as MockState)
		: DEFAULT_STATE;
}

// The cookie never changes underneath us without a full reload, so the store
// has no real subscription — `useSyncExternalStore` is used purely to read
// client-only state (document.cookie) without a hydration mismatch.
function subscribe(): () => void {
	return () => {};
}

/**
 * Floating dev-only control for switching the mock preview state (guest vs
 * signed-in subscriber variants). Writes the state cookie and reloads so the
 * server re-renders RSC fetches against the new state. Rendered by the root
 * layout only when `MOCK_DATA=true`, so it never ships to production.
 *
 * @returns The toggle panel
 */
export function MockStatePanel() {
	// Server snapshot is the guest default; the client snapshot reads the real
	// cookie. useSyncExternalStore reconciles the two without a hydration warning.
	const state = useSyncExternalStore(
		subscribe,
		readCookieState,
		() => DEFAULT_STATE,
	);

	function handleChange(next: MockState) {
		// One-year cookie, site-wide. Reload so RSC fetches re-run under the new state.
		document.cookie = `${MOCK_STATE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
		window.location.reload();
	}

	return (
		<div className="fixed bottom-3 left-3 z-(--z-toast) flex flex-col gap-1 rounded-lg border border-black/10 bg-white/95 p-2 text-xs shadow-lg backdrop-blur">
			<span className="font-semibold tracking-wide text-black/60 uppercase">
				🧪 Mock preview
			</span>
			<select
				aria-label="Mock preview state"
				className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
				value={state}
				onChange={event => handleChange(event.target.value as MockState)}
			>
				{MOCK_STATES.map(option => (
					<option key={option} value={option}>
						{MOCK_STATE_LABELS[option]}
					</option>
				))}
			</select>
		</div>
	);
}
