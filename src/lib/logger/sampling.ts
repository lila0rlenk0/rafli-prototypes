/**
 * Tail Sampling
 *
 * Decides whether to emit a wide event AFTER the action completes.
 * Keeps every failure and anomaly, samples happy-path at 5%.
 *
 * This keeps log volume low (~600 events/s at 10k req/s with 1% error rate)
 * while guaranteeing every actionable event is captured.
 */

import type { WideEvent } from './event';

/** Slow action threshold in ms — anything above this is always logged */
const SLOW_THRESHOLD_MS = 5_000;

/** Percentage of successful events to keep (0–1) */
const SUCCESS_SAMPLE_RATE = 0.05;

/**
 * Determines whether a completed wide event should be emitted.
 *
 * Rules (evaluated top-to-bottom, first match wins):
 * 1. Failures → always keep (100%)
 * 2. Contract drift (Zod) → always keep (100%)
 * 3. Slow actions (>5s) → always keep (100%)
 * 4. Successful actions → sample at 5%
 *
 * @param event - Completed wide event
 * @returns true if the event should be emitted
 */
export function shouldSample(event: WideEvent): boolean {
	// Every failure is logged — this is the primary use case
	if (event.success === false) return true;

	// Contract drift is a critical infrastructure signal
	if (event.errorSource === 'zod') return true;

	// Slow actions indicate backend degradation
	if (event.durationMs !== null && event.durationMs > SLOW_THRESHOLD_MS) {
		return true;
	}

	// Happy path — sample at 5% to maintain baseline visibility
	return Math.random() < SUCCESS_SAMPLE_RATE;
}
