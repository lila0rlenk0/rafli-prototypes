'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

const BECOME_HOST_FORM_URL = 'https://forms.gle/RqihwzjyBcjjwUa97';

/**
 * ModeSwitchButton Component
 *
 * Displays different UI based on user permissions and mode state:
 * - Loading (mode null): Disabled button
 * - No permission: "Become a Host" external link
 * - Has permission: "Switch to [opposite mode] Mode" button
 *
 * On switch: awaits cookie write then triggers server re-render
 * so server-rendered content (raffle lists, tabs) reflects the new mode
 */
export function ModeSwitchButton() {
	const mode = useUserStore(state => state.mode);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);
	const switchMode = useUserStore(state => state.switchMode);
	const router = useRouter();
	const [isSwitching, startTransition] = useTransition();

	/**
	 * Handles mode switch: updates store, awaits cookie sync,
	 * then refreshes server components so they re-render with the new mode
	 */
	function handleModeSwitch() {
		startTransition(async () => {
			await switchMode();
			router.refresh();
		});
	}

	/**
	 * Gets button label showing the mode user will switch TO
	 */
	function getButtonText(): string {
		const target =
			mode === USER_MODE.HOST ? USER_MODE.PARTICIPANT : USER_MODE.HOST;
		return `Switch to ${target.charAt(0).toUpperCase() + target.slice(1)} Mode`;
	}

	// Loading state while mode initializes
	if (mode === null) {
		return (
			<Button
				variant="outline"
				size="default"
				disabled
				className="cursor-not-allowed border-black text-black opacity-50"
				data-testid="mode-switch-button"
			>
				<span className="hidden sm:inline">Loading...</span>
				<span className="sm:hidden">...</span>
			</Button>
		);
	}

	if (!canSwitchMode()) {
		return (
			<Button
				asChild
				variant="default"
				size="default"
				className="bg-black text-white hover:bg-black/90"
			>
				<a
					href={BECOME_HOST_FORM_URL}
					target="_blank"
					rel="noopener noreferrer"
					data-testid="become-a-host-button"
				>
					Become a Host
				</a>
			</Button>
		);
	}

	return (
		<Button
			data-mode={mode}
			onClick={handleModeSwitch}
			disabled={isSwitching}
			variant="outline"
			size="default"
			className={cn(
				'border-black text-black data-[mode=participant]:bg-black data-[mode=participant]:text-white',
				isSwitching ? 'cursor-not-allowed' : 'cursor-pointer',
			)}
			data-testid="mode-switch-button"
		>
			<span className="hidden sm:inline">{getButtonText()}</span>
			<span className="sm:hidden">Switch Mode</span>
		</Button>
	);
}
