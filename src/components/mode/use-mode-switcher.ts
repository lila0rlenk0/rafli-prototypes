'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { PROFILE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE, type UserMode } from '@/types/user-mode';

/**
 * Discriminated union describing which render branch the mode switcher UI
 * should display. Keeping this as a union (instead of a bag of booleans)
 * forces call sites to handle every phase via exhaustive `switch`.
 */
export type ModeSwitcherState =
	| {
			/** Mode not initialized and no permissions — render nothing (sign-out flash guard) */
			readonly phase: 'hidden';
	  }
	| {
			/** Mode not initialized but permissions exist — show disabled skeleton until hydration */
			readonly phase: 'loading';
	  }
	| {
			/** Mode initialized but user lacks `raffle:create` — show "Become a Host" CTA */
			readonly phase: 'promote';
	  }
	| {
			/** Mode initialized and user can switch — render interactive toggle */
			readonly phase: 'ready';
			readonly mode: UserMode;
			readonly isHost: boolean;
			readonly isSwitching: boolean;
			readonly handleSwitch: (target: UserMode) => void;
	  };

/**
 * Shared logic for the two mode switcher layouts (`ModeSwitchButton` pill
 * and `ModeSwitchToggle` full-width). Owns:
 *   - user-store subscriptions (mode, permissions, canSwitchMode, switchMode)
 *   - `useTransition` loading state for the async store action
 *   - the `handleSwitch` handler: permission gate, Mixpanel tracking,
 *     awaited `switchMode` followed by `router.refresh()` so server
 *     components re-read the updated `raffly-user-mode` cookie
 *   - phase resolution, so both layouts render from a single state machine
 *
 * Does NOT own:
 *   - the "Become a Host" navigation link or its tracking event — that
 *     event carries a layout-specific `source` (`navbar` vs `mobile_menu`)
 *     and belongs to the wrapper component that knows its own context
 *   - any rendering — this hook is headless on purpose so both wrappers
 *     can diverge visually without forking the behavior
 *
 * The split exists because the only real difference between the two
 * components was CSS layout; the behavior was ~90% duplicated.
 *
 * @returns discriminated `ModeSwitcherState` that drives the layout wrapper
 */
export function useModeSwitcher(): ModeSwitcherState {
	// Subscribe to each slice individually so the component only re-renders
	// when the specific field it cares about changes (Zustand selector pattern).
	const mode = useUserStore(state => state.mode);
	const hasPermissions = useUserStore(state => state.permissions.length > 0);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);
	const switchMode = useUserStore(state => state.switchMode);

	const router = useRouter();
	// useTransition keeps the UI responsive while the async cookie write and
	// subsequent router.refresh() are in flight — the pending flag disables
	// the buttons without blocking other React updates.
	const [isSwitching, startTransition] = useTransition();

	// mode is null during two distinct phases:
	// 1. Initial hydration — permissions exist but Zustand hasn't resolved mode yet → loading skeleton
	// 2. Sign-out reset — permissions were cleared → hidden to avoid a flash of the disabled pill
	if (mode === null) {
		return hasPermissions ? { phase: 'loading' } : { phase: 'hidden' };
	}

	if (!canSwitchMode()) {
		return { phase: 'promote' };
	}

	function handleSwitch(target: UserMode) {
		// Guard against no-op and double-fire while a transition is pending.
		// Narrowed: this closure is only created on the 'ready' branch where
		// `mode` is non-null, so the analytics payload below is safe.
		if (target === mode || isSwitching) return;

		// Track BEFORE starting the transition so the event fires immediately
		// regardless of how long the async switchMode() + refresh takes.
		track(PROFILE_EVENTS.MODE_SWITCHED, {
			from_mode: mode,
			to_mode: target,
		});

		startTransition(async () => {
			// Await the cookie write before refreshing — ensures server
			// components on the next render read the new user mode.
			await switchMode();
			router.refresh();
		});
	}

	return {
		phase: 'ready',
		mode,
		isHost: mode === USER_MODE.HOST,
		isSwitching,
		handleSwitch,
	};
}
