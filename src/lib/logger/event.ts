/**
 * Wide Event — Canonical Log Line
 *
 * One structured JSON object per server action invocation, emitted to stdout.
 * Designed for querying ("show me all payment failures in the last hour")
 * rather than grep-based archaeology.
 *
 * Vercel captures stdout into its log drain → forwarded to Datadog/Axiom/etc.
 *
 * @see https://loggingsucks.com — philosophy behind this approach
 */

/** Error origin classification */
export type ErrorSource = 'zod' | 'api' | 'network' | 'unknown';

/**
 * Shape of a single wide event emitted per server action call.
 * Generic fields are set by `withLogging`; business context is
 * added via the `extras` bag.
 */
export interface WideEvent {
	// Identity
	readonly requestId: string;
	readonly timestamp: string;
	readonly service: string;
	readonly action: string;

	// User context (null when unauthenticated)
	userId: string | null;

	// Request context
	clientIp: string | null;

	// Outcome — set after the action completes
	success: boolean | null;
	errorCode: string | null;
	errorSource: ErrorSource | null;
	httpStatus: number | null;
	durationMs: number | null;

	// Backend call metadata
	method: string | null;
	endpoint: string | null;
	retryCount: number | null;

	// Action-specific business context (orderId, raffleId, amount, etc.)
	// Kept as a separate bag to avoid index signature weakening type safety on known fields.
	extras: Record<string, unknown>;
}

/**
 * Creates a fresh wide event with identity fields populated.
 * Call at the start of every server action.
 *
 * @param requestId - Unique ID for this invocation (crypto.randomUUID)
 * @param service - Domain name (e.g. "payment", "raffle")
 * @param action - Server action name (e.g. "pay-with-credits")
 * @returns Mutable WideEvent to be enriched throughout the action lifecycle
 */
export function createWideEvent(
	requestId: string,
	service: string,
	action: string,
): WideEvent {
	return {
		requestId,
		timestamp: new Date().toISOString(),
		service,
		action,
		userId: null,
		clientIp: null,
		success: null,
		errorCode: null,
		errorSource: null,
		httpStatus: null,
		durationMs: null,
		method: null,
		endpoint: null,
		retryCount: null,
		extras: {},
	};
}

/**
 * Serializes the wide event as a single JSON line to stdout.
 * Vercel's log drain captures stdout automatically — no transport library needed.
 *
 * @param event - Completed wide event with all fields populated
 */
export function emitWideEvent(event: WideEvent): void {
	// Single JSON line — structured for log drain ingestion.
	// console.log (not process.stdout.write) for Edge Runtime compatibility.
	// The trailing newline console.log adds is harmless for log drains.
	console.log(JSON.stringify(event));
}
