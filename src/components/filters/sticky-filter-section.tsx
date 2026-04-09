'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

interface StickyFilterSectionProps {
	children: React.ReactNode;
}

/**
 * StickyFilterSection Component
 *
 * Wraps the filter bar and heading so they become fixed at the top of the
 * viewport on mobile once the user scrolls past their original position.
 *
 * Uses an IntersectionObserver on a zero-height sentinel element placed just
 * above the filter bar. When the sentinel exits the viewport upward the bar
 * receives a `.is-sticky` treatment (fixed, full-width, z-100, page bg).
 * A placeholder with the same height is injected to prevent layout jump.
 *
 * Desktop (>768 px) — normal document flow, no sticky behavior.
 *
 * @returns The wrapped filter section with mobile sticky behavior
 */
export function StickyFilterSection({ children }: StickyFilterSectionProps) {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const barRef = useRef<HTMLDivElement>(null);
	const [isSticky, setIsSticky] = useState(false);
	const [barHeight, setBarHeight] = useState(0);

	// useCallback: avoids re-creating the measurement closure each render.
	// Stable identity prevents the IntersectionObserver effect from re-running unnecessarily.
	const measureBar = useCallback(() => {
		if (!barRef.current) return;
		setBarHeight(barRef.current.offsetHeight);
	}, []);

	// mount: sets up IntersectionObserver on sentinel + resize listener.
	// Deps: measureBar (stable via useCallback).
	// Cleanup: disconnects observer and removes resize listener.
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		measureBar();

		/**
		 * Checks if we are at a mobile breakpoint
		 * @returns true when viewport width is at or below the mobile breakpoint
		 */
		function isMobile(): boolean {
			return window.innerWidth <= MOBILE_BREAKPOINT;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!isMobile()) {
					setIsSticky(false);
					return;
				}
				// Sentinel exited upward → stick the bar
				setIsSticky(!entry.isIntersecting);
			},
			{ threshold: 0 },
		);

		observer.observe(sentinel);

		/**
		 * Unstick on resize if we cross into desktop
		 */
		function handleResize() {
			if (!isMobile()) {
				setIsSticky(false);
			}
			measureBar();
		}

		window.addEventListener('resize', handleResize);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', handleResize);
		};
	}, [measureBar]);

	return (
		<>
			{/* Sentinel — zero-height marker observed by IntersectionObserver */}
			<div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

			{/* Placeholder — prevents layout jump when bar goes fixed */}
			{isSticky ? (
				<div style={{ height: barHeight }} aria-hidden="true" />
			) : null}

			<div
				ref={barRef}
				className={
					isSticky
						? 'bg-background fixed top-14 left-0 z-[100] w-full border-b border-black px-3 py-3 shadow-sm sm:static sm:z-auto sm:w-auto sm:border-none sm:px-0 sm:py-0 sm:shadow-none'
						: ''
				}
			>
				{children}
			</div>
		</>
	);
}
