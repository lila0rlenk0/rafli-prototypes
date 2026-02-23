'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Safe setTimeout wrapper that auto-clears on unmount.
 * Prevents memory leaks and state updates on unmounted components.
 * Only tracks one timeout at a time — calling again cancels the previous.
 *
 * @returns A function with the same signature as setTimeout(fn, ms)
 */
export function useTimeout() {
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

	// Clear any pending timeout when the component unmounts
	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	return useCallback((fn: () => void, ms: number) => {
		// Cancel previous timeout before scheduling a new one
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(fn, ms);
	}, []);
}
