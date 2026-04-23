/**
 * Pure timer utility for the X-share verify auto-retry flow. No React
 * imports — the hook layer wraps this in `useRef`/`useEffect` and owns
 * lifecycle. Keeping the timer logic separate makes it unit-testable via
 * Bun's fake timers without touching a renderer.
 *
 * Contract:
 *  - `start(onTick, onFire)` schedules a 1s interval, ticking down from
 *    DELAY to 0. When it hits 0 the interval is cleared and `onFire` runs
 *    on the next macrotask — mirrors the original behavior so the UI can
 *    commit the countdown-to-zero render before the async verify mutates
 *    state.
 *  - `cancel()` clears any pending interval and pending fire. Safe to
 *    call multiple times; safe to call before `start`.
 *  - `isActive()` reports whether a countdown is currently scheduled.
 *
 * Auto-fire is deferred via `setTimeout(0)` rather than called inline so
 * React can flush the `prev → 0` state update before the verify call
 * begins — identical to the behavior the pre-split hook relied on.
 */

/** Seconds to wait before auto-retrying when a tweet is not yet indexed. */
export const AUTO_RETRY_DELAY_S = 15;

// Interval handle type — `setInterval`'s return type differs between Node
// and browser; the union satisfies both so the util works in tests
// (bun:test — Node) and at runtime (browser).
type IntervalHandle = ReturnType<typeof setInterval>;
type TimeoutHandle = ReturnType<typeof setTimeout>;

export interface AutoRetryController {
	/**
	 * Starts a countdown. Cancels any in-flight countdown first so
	 * calling `start` twice never leaks a timer.
	 *
	 * @param onTick - Called with remaining seconds after each tick
	 *   (including the initial DELAY value). Consumer typically forwards
	 *   this to a state setter for the countdown label.
	 * @param onFire - Called once, on the next macrotask after the
	 *   countdown reaches 0. Consumer wires this to the verify action.
	 */
	start: (onTick: (remaining: number) => void, onFire: () => void) => void;
	/**
	 * Cancels any pending countdown and clears the pending fire.
	 */
	cancel: () => void;
	/**
	 * @returns `true` while a countdown is scheduled.
	 */
	isActive: () => boolean;
}

/**
 * Creates a standalone auto-retry controller. One controller per hook
 * instance — do not share across components or the onFire callback from
 * one mount could fire in another.
 *
 * @returns An `AutoRetryController` with `start`, `cancel`, and
 *   `isActive` methods.
 */
export function createAutoRetryController(): AutoRetryController {
	let intervalHandle: IntervalHandle | null = null;
	let fireHandle: TimeoutHandle | null = null;

	function cancel(): void {
		if (intervalHandle !== null) {
			clearInterval(intervalHandle);
			intervalHandle = null;
		}
		if (fireHandle !== null) {
			clearTimeout(fireHandle);
			fireHandle = null;
		}
	}

	function start(
		onTick: (remaining: number) => void,
		onFire: () => void,
	): void {
		// Always cancel first — defensive against double-start races.
		cancel();

		let remaining = AUTO_RETRY_DELAY_S;
		onTick(remaining);

		intervalHandle = setInterval(() => {
			remaining -= 1;
			if (remaining > 0) {
				onTick(remaining);
				return;
			}

			// Clear the interval and surface 0 first so the UI can paint
			// the final countdown frame before verify mutates state.
			if (intervalHandle !== null) {
				clearInterval(intervalHandle);
				intervalHandle = null;
			}
			onTick(0);
			// Defer the fire to the next macrotask — same reason the
			// pre-split hook used `setTimeout(0)`.
			fireHandle = setTimeout(() => {
				fireHandle = null;
				onFire();
			}, 0);
		}, 1_000);
	}

	function isActive(): boolean {
		return intervalHandle !== null || fireHandle !== null;
	}

	return { start, cancel, isActive };
}
