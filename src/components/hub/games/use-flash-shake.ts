'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** A resolved game outcome — drives the colour of the flash wash. */
export type FlashType = 'win' | 'loss';

export interface FlashShake {
	/** Active flash wash, or null when idle. */
	readonly flash: FlashType | null;
	/** True while the loss shake is animating. */
	readonly isShaking: boolean;
	/** Fire the win/loss reaction. */
	readonly trigger: (type: FlashType) => void;
}

/**
 * Drives the shared win/loss reaction: a full-screen colour flash on any
 * outcome plus a lateral screen shake on a loss. The double
 * `requestAnimationFrame` clears any in-flight flash and lets the browser
 * paint the reset before re-arming, so a back-to-back replay re-triggers the
 * CSS animation reliably.
 *
 * @returns The current flash/shake state and a `trigger` to fire it
 */
export function useFlashShake(): FlashShake {
	const [flash, setFlash] = useState<FlashType | null>(null);
	const [isShaking, setIsShaking] = useState(false);
	// Track timers so an unmount mid-reaction doesn't set state on a dead tree.
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	const trigger = useCallback((type: FlashType) => {
		setFlash(null);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setFlash(type);
				timers.current.push(setTimeout(() => setFlash(null), 750));
				if (type === 'loss') {
					timers.current.push(
						setTimeout(() => {
							setIsShaking(true);
							timers.current.push(setTimeout(() => setIsShaking(false), 620));
						}, 60),
					);
				}
			});
		});
	}, []);

	// mount: capture the timer list for cleanup on unmount.
	useEffect(() => {
		const pending = timers.current;
		return () => pending.forEach(clearTimeout);
	}, []);

	return { flash, isShaking, trigger };
}
