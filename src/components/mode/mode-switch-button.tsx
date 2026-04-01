'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { PROFILE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

const BECOME_HOST_FORM_URL = 'https://forms.gle/RqihwzjyBcjjwUa97';

/**
 * ModeSwitchButton Component
 *
 * Compact pill toggle for switching between Host and Participant modes.
 * Active mode shows black background with white text; inactive is transparent.
 *
 * @returns Pill toggle, "Become a Host" link, or loading state
 */
export function ModeSwitchButton() {
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

	if (!canSwitchMode()) {
		return (
			<a
				href={BECOME_HOST_FORM_URL}
				target="_blank"
				rel="noopener noreferrer"
				className="flex h-9 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white"
				data-testid="become-a-host-button"
				onClick={() =>
					track(PROFILE_EVENTS.HOST_APPLICATION_STARTED, { source: 'navbar' })
				}
			>
				Become a Host
			</a>
		);
	}

	const isHost = mode === USER_MODE.HOST;

	return (
		<div
			className="relative flex h-9 w-[267px] items-center overflow-hidden rounded-full border border-black/95"
			data-testid="mode-switch-button"
		>
			<button
				onClick={() => handleSwitch(USER_MODE.HOST)}
				disabled={isSwitching}
				className={cn(
					'relative z-10 flex h-full flex-1 items-center justify-center rounded-full text-sm font-semibold transition-colors',
					isHost ? 'bg-black/95 text-white' : 'bg-transparent text-black/95',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Host
			</button>
			<button
				onClick={() => handleSwitch(USER_MODE.PARTICIPANT)}
				disabled={isSwitching}
				className={cn(
					'relative z-10 flex h-full flex-1 items-center justify-center rounded-full text-sm font-semibold transition-colors',
					!isHost ? 'bg-black/95 text-white' : 'bg-transparent text-black/95',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Participant
			</button>
		</div>
	);
}
