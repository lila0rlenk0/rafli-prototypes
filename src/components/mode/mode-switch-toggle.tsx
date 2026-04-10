'use client';

import Link from 'next/link';

import { PROFILE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { cn } from '@/lib/utils';
import { USER_MODE } from '@/types/user-mode';

import { useModeSwitcher } from './use-mode-switcher';

// Shared geometry for both halves of the toggle — kept at module scope so
// the className string is not re-created per render.
const TOGGLE_BUTTON_BASE =
	'flex flex-1 items-center justify-center text-sm font-semibold transition-colors';

// Layout-specific "Become a Host" tracking — `source` identifies this as the
// mobile menu entry point, which is why it can't live in the shared hook.
function handleBecomeHostClick() {
	track(PROFILE_EVENTS.HOST_APPLICATION_STARTED, {
		source: 'mobile_menu',
	});
}

/**
 * Full-width segmented toggle for switching between host and participant
 * modes. Used inside the mobile menu drawer. All behavior lives in
 * `useModeSwitcher`; this component only owns layout.
 *
 * @returns Full-width mode switcher, loading skeleton, or "Become a Host" CTA
 */
export function ModeSwitchToggle() {
	const state = useModeSwitcher();

	if (state.phase === 'hidden') return null;

	if (state.phase === 'loading') {
		return (
			<div
				className="flex h-[38px] w-full items-center overflow-hidden rounded-full border border-black opacity-50"
				data-testid="mode-switch-toggle"
			>
				<div className="flex flex-1 items-center justify-center text-sm font-semibold text-black">
					Host
				</div>
				<div className="h-full w-px bg-black" />
				<div className="flex flex-1 items-center justify-center text-sm font-semibold text-black">
					Participant
				</div>
			</div>
		);
	}

	if (state.phase === 'promote') {
		return (
			<Link
				href="/verification"
				className="flex h-[38px] w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white"
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
			className="flex h-[38px] w-full overflow-hidden rounded-full border border-black"
			data-testid="mode-switch-toggle"
		>
			<button
				onClick={onHostClick}
				disabled={isSwitching}
				className={cn(
					TOGGLE_BUTTON_BASE,
					isHost ? 'bg-black text-white' : 'bg-transparent text-black',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Host
			</button>
			<div className="h-full w-px bg-black" />
			<button
				onClick={onParticipantClick}
				disabled={isSwitching}
				className={cn(
					TOGGLE_BUTTON_BASE,
					!isHost ? 'bg-black text-white' : 'bg-transparent text-black',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Participant
			</button>
		</div>
	);
}
