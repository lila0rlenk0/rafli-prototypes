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
	// Ref instead of state — timeout ID has no render impact, only lifecycle management
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

	// mount: Clear any pending timeout when the component unmounts to prevent
	// stale callbacks firing after teardown (e.g. navigating away mid-delay).
	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	// useCallback: Stable reference so consumers can safely include in dependency arrays
	// without triggering re-effects. Deps are empty because timeoutRef is a ref (stable).
	return useCallback((fn: () => void, ms: number) => {
		// Cancel previous timeout before scheduling a new one
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(fn, ms);
	}, []);
}
