/**
 * Computes the next rolling-window boundary strictly greater than `nowMs`.
 *
 * The launch-pricing countdown is anchored to the unix epoch and loops every
 * `windowMs`. Anchoring to a fixed reference (epoch=0) instead of a per-session
 * timestamp guarantees every client landing on /pricing at the same instant
 * sees the same deadline — there is no per-tab drift, no SSR/CSR mismatch in
 * "what time we're counting down to", and a refresh during the window does not
 * reset the clock (the previous boundary is still in the past so we land on
 * the same forward boundary).
 *
 * @param nowMs - Current wall-clock time in milliseconds since the unix epoch.
 * @param windowMs - Length of the rolling window (e.g. 2 days).
 * @returns The next boundary in ms — strictly greater than `nowMs`.
 */
export function computeNextBoundary(nowMs: number, windowMs: number): number {
	// `Math.floor(...) + 1` (rather than `Math.ceil`) guarantees the result is
	// strictly greater than `nowMs`. `Math.ceil` would return `nowMs` itself when
	// `nowMs % windowMs === 0`, which would make the ticker render a single
	// `expired` snapshot before rolling forward — a one-tick visual glitch.
	return (Math.floor(nowMs / windowMs) + 1) * windowMs;
}
