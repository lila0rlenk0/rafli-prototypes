import type { CountdownParts } from './format-countdown';

/**
 * Stable placeholder parts used as the `useState` seed for `LaunchCountdown`.
 *
 * Why this lives in its own module:
 * - The component is a Client Component (`'use client'`) — importing from the
 *   `.tsx` file in a unit test would drag React into the Bun test runtime.
 *   The placeholder has no React dependency, so carving it out keeps the
 *   test boundary clean and the test file free of DOM shims.
 * - A pure constant is trivially assertable: a future refactor that spreads
 *   into a new object per render would change reference identity and the
 *   co-located unit test catches it before the change ships.
 *
 * Why these values:
 * - `expired: false` — the SSR render and the first client render MUST emit
 *   the same HTML to avoid a React hydration warning. A truthy placeholder
 *   would make the component return `null` on SSR (business rule: "expired
 *   means hide") but render a real value after hydration.
 * - `'--'` for each field — width-2 strings match the `HH:MM:SS` layout so
 *   the first real tick doesn't collapse the column width and produce a
 *   one-frame layout jump.
 */
export const INITIAL_PARTS: CountdownParts = {
	hours: '--',
	minutes: '--',
	seconds: '--',
	expired: false,
};
