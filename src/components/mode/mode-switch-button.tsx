'use client';

import { Button } from '@/components/ui/button';
import { useUserStore } from '@/providers/user-store-provider';

const BECOME_HOST_FORM_URL = 'https://forms.google.com/placeholder';

/**
 * ModeSwitchButton Component
 *
 * Displays different UI based on user permissions:
 * - No permission: "Become a Host" external link
 * - Has permission (Participant mode): "Switch to Host Mode" button
 * - Has permission (Host mode): "Switch to Participant Mode" button
 */
export function ModeSwitchButton() {
	const mode = useUserStore(state => state.mode);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);
	const switchMode = useUserStore(state => state.switchMode);

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

	function getButtonText() {
		const capitalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1);

		return `Switch to ${capitalizedMode} Mode`;
	}

	return (
		<Button
			data-mode={mode}
			onClick={handleModeSwitch}
			variant="outline"
			size="sm"
			className="flex cursor-pointer items-center gap-2 border-black text-black data-[mode=host]:bg-black data-[mode=host]:text-white"
		>
			<span className="hidden sm:inline">{getButtonText()}</span>
			<span className="sm:hidden">Switch Mode</span>
		</Button>
	);
}
