'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

const BECOME_HOST_FORM_URL = 'https://forms.gle/RqihwzjyBcjjwUa97';

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
				<div className="flex flex-1 items-center justify-center text-sm text-black">
					Host
				</div>
				<div className="h-full w-px bg-black" />
				<div className="flex flex-1 items-center justify-center text-sm text-black">
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
				className="flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white"
				data-testid="become-a-host-button"
			>
				Become a Host
			</a>
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
					'flex flex-1 items-center justify-center text-sm font-medium transition-colors',
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
					'flex flex-1 items-center justify-center text-sm font-medium transition-colors',
					!isHost ? 'bg-black text-white' : 'bg-transparent text-black',
					isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
				)}
			>
				Participant
			</button>
		</div>
	);
}
