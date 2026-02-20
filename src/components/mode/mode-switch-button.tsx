'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
 *
 * On switch: awaits cookie write then triggers server re-render
 * so server-rendered content (raffle lists, tabs) reflects the new mode
 */
export function ModeSwitchButton() {
	const mode = useUserStore(state => state.mode);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);
	const switchMode = useUserStore(state => state.switchMode);
	const router = useRouter();
	const [isSwitching, setIsSwitching] = useState(false);

	// Guard against state updates after unmount —
	// router.refresh() can remount the component tree mid-await
	const isMountedRef = useRef(true);
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	/**
	 * Handles mode switch: updates store, awaits cookie sync,
	 * then refreshes server components so they re-render with the new mode
	 */
	async function handleModeSwitch() {
		setIsSwitching(true);
		try {
			// Awaits the cookie write — guarantees server reads the new value
			await switchMode();
			// Re-render server components (page.tsx reads mode from cookie)
			router.refresh();
		} finally {
			if (isMountedRef.current) {
				setIsSwitching(false);
			}
		}
	}

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
	 * Gets button label showing the mode user will switch TO
	 */
	function getButtonText(): string {
		const target =
			mode === USER_MODE.HOST ? USER_MODE.PARTICIPANT : USER_MODE.HOST;
		return `Switch to ${target.charAt(0).toUpperCase() + target.slice(1)} Mode`;
	}

	return (
		<Button
			data-mode={mode}
			onClick={handleModeSwitch}
			disabled={isSwitching}
			variant="outline"
			size="sm"
			className="flex cursor-pointer items-center gap-2 border-black text-black data-[mode=participant]:bg-black data-[mode=participant]:text-white"
		>
			<span className="hidden sm:inline">{getButtonText()}</span>
			<span className="sm:hidden">Switch Mode</span>
		</Button>
	);
}
