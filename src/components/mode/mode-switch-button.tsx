'use client';

import Link from 'next/link';

import { PROFILE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { cn } from '@/lib/utils';
import { USER_MODE } from '@/types/user-mode';

import { useModeSwitcher } from './use-mode-switcher';

// Shared pill/button geometry — extracted so both active buttons stay in lockstep.
const PILL_BUTTON_BASE =
	'relative z-10 flex h-full flex-1 items-center justify-center rounded-full text-sm font-semibold transition-colors';

// "Become a Host" is a layout-local concern: the click tracking includes a
// `source` that differs between the navbar pill and the mobile toggle, so it
// lives in the component rather than the shared hook.
function handleBecomeHostClick() {
	track(PROFILE_EVENTS.HOST_APPLICATION_STARTED, { source: 'navbar' });
}

/**
 * Navbar-sized pill toggle for switching between host and participant modes.
 * All behavior lives in `useModeSwitcher`; this component only owns layout.
 *
 * @returns Pill-shaped mode switcher, loading skeleton, or "Become a Host" CTA
 */
export function ModeSwitchButton() {
	const state = useModeSwitcher();

	if (state.phase === 'hidden') return null;

	if (state.phase === 'loading') {
		return (
			<div
				className="flex h-9 w-[267px] items-center overflow-hidden rounded-full border border-black/95 opacity-50"
				data-testid="mode-switch-button"
			>
				<div className="flex flex-1 items-center justify-center text-sm font-semibold text-black/95">
					Host
				</div>
				<div className="flex flex-1 items-center justify-center text-sm font-semibold text-black/95">
					Participant
				</div>
			</div>
		);
	}

	if (state.phase === 'promote') {
		return (
			<Link
				href="/verification"
				className="flex h-9 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white"
				data-testid="become-a-host-button"
				onClick={handleBecomeHostClick}
			>
				Become a Host
			</Link>
		);
	}

	const { isHost, isSwitching, handleSwitch } = state;

	// Extracted to avoid inline arrow functions inside JSX (per code-style rules).
	function onHostClick() {
		handleSwitch(USER_MODE.HOST);
	}

	function onParticipantClick() {
		handleSwitch(USER_MODE.PARTICIPANT);
	}

	return (
		<div
			className="relative flex h-9 w-[267px] items-center overflow-hidden rounded-full border border-black/95"
			data-testid="mode-switch-button"
		>
			<button
				onClick={onHostClick}
				disabled={isSwitching}
				className={cn(
					PILL_BUTTON_BASE,
					isHost ? 'bg-black/95 text-white' : 'bg-transparent text-black/95',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Host
			</button>
			<button
				onClick={onParticipantClick}
				disabled={isSwitching}
				className={cn(
					PILL_BUTTON_BASE,
					!isHost ? 'bg-black/95 text-white' : 'bg-transparent text-black/95',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Participant
			</button>
		</div>
	);
}
