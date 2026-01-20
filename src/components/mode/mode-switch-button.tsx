'use client';

import { Button } from '@/components/ui/button';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

const BECOME_HOST_FORM_URL = 'https://forms.google.com/placeholder';

/**
 * ModeSwitchButton Component
 *
 * Displays different UI based on user permissions and mode state:
 * - Loading (mode null): Disabled button
 * - No permission: "Become a Host" external link
 * - Has permission: "Switch to [opposite mode] Mode" button
 */
export function ModeSwitchButton() {
	const mode = useUserStore(state => state.mode);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);
	const switchMode = useUserStore(state => state.switchMode);

	// Loading state while mode initializes
	if (mode === null) {
		return (
			<Button
				variant="outline"
				size="sm"
				disabled
				className="flex cursor-not-allowed items-center gap-2 border-black text-black opacity-50"
			>
				<span className="hidden sm:inline">Loading...</span>
				<span className="sm:hidden">...</span>
			</Button>
		);
	}

	/**
	 * Handles mode switch button click
	 */
	function handleModeSwitch() {
		switchMode();
	}

	if (!canSwitchMode()) {
		return (
			<a
				href={BECOME_HOST_FORM_URL}
				target="_blank"
				rel="noopener noreferrer"
				className="rounded-full border border-black bg-black px-4 py-2 text-white"
			>
				Become a Host
			</a>
		);
	}

	/**
	 * Gets the opposite mode to display in the button text
	 */
	function getOppositeMode(): string {
		return mode === USER_MODE.HOST ? USER_MODE.PARTICIPANT : USER_MODE.HOST;
	}

	function getButtonText() {
		const oppositeMode = getOppositeMode();
		const capitalizedMode =
			oppositeMode.charAt(0).toUpperCase() + oppositeMode.slice(1);

		return `Switch to ${capitalizedMode} Mode`;
	}

	return (
		<Button
			data-mode={mode}
			onClick={handleModeSwitch}
			variant="outline"
			size="sm"
			className="flex cursor-pointer items-center gap-2 border-black text-black data-[mode=participant]:bg-black data-[mode=participant]:text-white"
		>
			<span className="hidden sm:inline">{getButtonText()}</span>
			<span className="sm:hidden">Switch Mode</span>
		</Button>
	);
}
