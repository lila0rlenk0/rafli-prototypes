/** Replacement signal forwarded from wagmi's `onReplaced`. */
export type ReplacementReason = 'cancelled' | 'replaced' | 'repriced';

/**
 * Submit recovery mode observed after an ambiguous submit response:
 * - `null` — nothing to recover, backend accepted the hash or we never submitted
 * - `'poll'` — overlapping in-flight submit; wait for the response instead of retrying
 * - `'retry'` — safe to resend the same hash once to nudge backend into `confirming`
 */
export type SubmitRecoveryMode = null | 'poll' | 'retry';
