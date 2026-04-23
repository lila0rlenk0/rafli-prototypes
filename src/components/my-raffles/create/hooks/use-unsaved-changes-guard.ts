'use client';

import { useEffect, useRef } from 'react';

interface UseUnsavedChangesGuardOptions {
	hasUnsavedChanges: boolean;
	onInterceptNavigation: (targetHref: string) => void;
}

interface UseUnsavedChangesGuardResult {
	/**
	 * Set to `true` immediately before a full-page navigation you have
	 * explicitly approved (Save Draft → leave, or Leave Without Saving).
	 * Bypasses the browser `beforeunload` prompt for the pending leave.
	 */
	isLeavingRef: React.RefObject<boolean>;
	/**
	 * Tracks the href the user clicked while we intercepted — read from
	 * the save/leave handlers so navigation resumes once the user chooses.
	 */
	pendingNavigationRef: React.RefObject<string | null>;
}

/**
 * Guards against in-app navigation loss while a form has unsaved edits.
 * Wires two external syncs:
 *
 * 1. `beforeunload` — shows the browser's native "Leave site?" prompt so
 *    accidental closes are caught by the UA, not lost silently.
 * 2. A capture-phase document click listener — intercepts clicks on any
 *    `<a>` (including Next.js `<Link>`) that would cross the route
 *    boundary and calls back with the target href so the parent can
 *    surface a "Save draft?" modal.
 *
 * Both effects short-circuit when `hasUnsavedChanges` is false so the
 * default navigation is untouched while the form is empty.
 *
 * @returns Ref handles for bypassing the guard during an explicit leave.
 */
export function useUnsavedChangesGuard({
	hasUnsavedChanges,
	onInterceptNavigation,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult {
	const isLeavingRef = useRef(false);
	const pendingNavigationRef = useRef<string | null>(null);

	// beforeunload — native "Leave site?" prompt on tab close / reload.
	useEffect(() => {
		if (!hasUnsavedChanges) return;
		function handleBeforeUnload(event: BeforeUnloadEvent) {
			if (isLeavingRef.current) return;
			event.preventDefault();
		}
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [hasUnsavedChanges]);

	// Capture-phase anchor interceptor — fires before Next.js's router
	// can start a client-side transition, so the modal gets a chance to
	// veto the navigation.
	useEffect(() => {
		if (!hasUnsavedChanges) return;
		function handleLinkClick(event: MouseEvent) {
			const anchor = (event.target as HTMLElement).closest('a');
			if (!anchor) return;
			const href = anchor.getAttribute('href');
			if (!href || href.startsWith('#')) return;
			if (href.startsWith('http') && !href.startsWith(window.location.origin)) {
				return;
			}
			if (href === window.location.pathname) return;

			event.preventDefault();
			event.stopPropagation();
			pendingNavigationRef.current = href;
			onInterceptNavigation(href);
		}
		document.addEventListener('click', handleLinkClick, true);
		return () => document.removeEventListener('click', handleLinkClick, true);
	}, [hasUnsavedChanges, onInterceptNavigation]);

	return { isLeavingRef, pendingNavigationRef };
}
