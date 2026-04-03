'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { PROFILE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

/**
 * Full-width toggle for switching between Host and Participant modes on mobile.
 * Two side-by-side buttons separated by a 1px divider.
 * Selected mode has black background + white text; unselected is transparent + black text.
 *
 * @returns Mode toggle or "Become a Host" link if user lacks permission
 */
export function ModeSwitchToggle() {
	const mode = useUserStore(state => state.mode);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);
	const switchMode = useUserStore(state => state.switchMode);
	const router = useRouter();
	const [isSwitching, startTransition] = useTransition();

	/**
	 * Switches to the given target mode if it differs from the current mode
	 */
	function handleSwitch(
		target: typeof USER_MODE.HOST | typeof USER_MODE.PARTICIPANT,
	) {
		if (target === mode || isSwitching) return;
		track(PROFILE_EVENTS.MODE_SWITCHED, {
			from_mode: mode,
			to_mode: target,
		});
		startTransition(async () => {
			await switchMode();
			router.refresh();
		});
	}

	if (mode === null) {
		return (
			<div
				className="flex h-12 w-full items-center overflow-hidden rounded-full border border-black opacity-50"
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

	function handleBecomeHostClick() {
		track(PROFILE_EVENTS.HOST_APPLICATION_STARTED, {
			source: 'mobile_menu',
		});
	}

	if (!canSwitchMode()) {
		return (
			<Link
				href="/verification"
				className="flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white"
				data-testid="become-a-host-button"
				onClick={handleBecomeHostClick}
			>
				Become a Host
			</Link>
		);
	}

	const isHost = mode === USER_MODE.HOST;

	return (
		<div
			className="flex h-12 w-full overflow-hidden rounded-full border border-black"
			data-testid="mode-switch-toggle"
		>
			<button
				onClick={() => handleSwitch(USER_MODE.HOST)}
				disabled={isSwitching}
				className={cn(
					'flex flex-1 items-center justify-center text-sm font-semibold transition-colors',
					isHost ? 'bg-black text-white' : 'bg-transparent text-black',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Host
			</button>
			<div className="h-full w-px bg-black" />
			<button
				onClick={() => handleSwitch(USER_MODE.PARTICIPANT)}
				disabled={isSwitching}
				className={cn(
					'flex flex-1 items-center justify-center text-sm font-semibold transition-colors',
					!isHost ? 'bg-black text-white' : 'bg-transparent text-black',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Participant
			</button>
		</div>
	);
}
