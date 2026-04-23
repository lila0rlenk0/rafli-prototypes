import 'server-only';

import * as Sentry from '@sentry/nextjs';

import { logError, logInfo } from './logger';

/**
 * Wide-event (canonical log line) emitter.
 *
 * Implements the pattern described in
 * https://loggingsucks.com and Stripe's "canonical log lines" post:
 * **one context-rich event per request per service**, emitted once at
 * completion, instead of scattering multiple log lines across a
 * handler. The skill reference calls this the single highest-leverage
 * change a team can make to logging quality.
 *
 * Why this beats ad-hoc `logger.info()` calls:
 * - **Queryability.** One event per request means `COUNT BY
 *   action,outcome` gives an exact funnel breakdown — no log line
 *   deduplication, no sampling guesswork.
 * - **Correlation.** Every event carries `request_id`, which this
 *   module also stamps onto the Sentry scope. Clicking an error in
 *   Sentry → searching the log UI for that id returns the exact log
 *   line for the failed request, with all the business context the
 *   error event doesn't have (user plan, cart value, feature flags).
 * - **Cardinality.** The `fields` object is the dimensions column of
 *   a columnar log warehouse. High cardinality (raffleId, userId) is
 *   cheap to query and unblocks "why did this one user's request
 *   fail" investigations.
 *
 * Intended call shape for a server action:
 *
 *     export async function submitCryptoTx(input: Input): Promise<ServiceResponse<...>> {
 *       return withWideEvent({ service: 'payment', action: 'submit-crypto-tx' }, async event => {
 *         event.with({ raffleId: input.raffleId, chainId: input.chainId });
 *         // ...do work...
 *         event.setUser(userId);
 *         return success(data);
 *       });
 *     }
 *
 * The wrapper emits exactly one log line per invocation, tags the
 * Sentry scope so `captureException` inside the callback inherits
 * `request_id` / `service` / `action`, and times the action so
 * `duration_ms` is always present.
 */

export type Outcome = 'ok' | 'error' | 'exception';

/**
 * Builder handed to the `withWideEvent` callback. Methods return `this`
 * so handlers can chain, but mutation is the whole point — the event
 * is accumulated into a single object that `emit()` flushes once.
 */
export interface WideEvent {
	readonly requestId: string;
	/**
	 * Merge arbitrary structured context into the event. Accepts any
	 * field name; prefer snake_case for query-warehouse consistency.
	 *
	 * @param fields - Key/value pairs merged into the emitted payload
	 * @returns The same event (chainable)
	 */
	with(fields: Readonly<Record<string, unknown>>): WideEvent;
	/**
	 * Record the authenticated user on the event. Kept separate from
	 * `with()` so the field name stays consistent (`user_id`) across
	 * every service — this is the join key analytics queries rely on.
	 *
	 * @param userId - Authenticated user id (never PII — use `setSentryUser` for attribution)
	 * @returns The same event (chainable)
	 */
	setUser(userId: string): WideEvent;
	/**
	 * Flush the event as a single structured log line. Called by
	 * `withWideEvent` automatically; direct callers are responsible
	 * for ensuring exactly one emit per request, otherwise the
	 * "canonical log line" invariant breaks.
	 *
	 * @param outcome - Terminal state of the request
	 * @param errorCode - Typed error code when `outcome !== 'ok'`
	 */
	emit(outcome: Outcome, errorCode?: string): void;
}

/**
 * Minimal shape required from `withWideEvent`'s callback return value.
 * Intentionally structural — both `@/types/service-response` and any
 * adjacent discriminated union with the same two fields will satisfy
 * it, which keeps this module free of cross-layer imports.
 */
export interface WideEventResult<E extends string> {
	readonly success: boolean;
	readonly error?: E;
}

/**
 * Stable identifier per invocation. Uses the Web Crypto API so the
 * same code runs in Node (v19+) and the Vercel edge runtime without a
 * platform-specific import. Falls back to a timestamp+random hybrid on
 * runtimes that lack `randomUUID` (none currently supported, but the
 * fallback costs nothing and removes a future-compat footgun).
 *
 * @returns Hex-dashed UUID string
 */
function newRequestId(): string {
	const c: Crypto | undefined = globalThis.crypto;
	if (c && typeof c.randomUUID === 'function') {
		return c.randomUUID();
	}
	// Fallback — base36 timestamp + random, collision-unlikely within a
	// single process lifetime. Not cryptographically unique; the
	// primary path above is.
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a standalone wide-event builder without wrapping a callback.
 * Useful for long-running background jobs or streaming handlers where
 * `withWideEvent` doesn't fit. For server actions, prefer
 * `withWideEvent` — the wrapper guarantees exactly-once emission.
 *
 * @param service - Domain name (e.g. `'payment'`, `'raffle'`)
 * @param action - Action name, matching the server-action filename
 * @returns A fresh `WideEvent` with `request_id` and start time set
 */
export function createWideEvent(service: string, action: string): WideEvent {
	const requestId = newRequestId();
	const startMs = performance.now();
	const fields: Record<string, unknown> = {};
	let userId: string | null = null;
	let emitted = false;

	const event: WideEvent = {
		requestId,
		with(extra) {
			Object.assign(fields, extra);
			return event;
		},
		setUser(id) {
			userId = id;
			return event;
		},
		emit(outcome, errorCode) {
			// Exactly-once invariant — a second emit would double-count
			// the request in downstream funnel queries. Swallow silently:
			// throwing here would mask the original request outcome.
			if (emitted) return;
			emitted = true;

			const durationMs = Math.round(performance.now() - startMs);
			// Canonical fields spread AFTER user-supplied `fields` so a
			// handler that accidentally sets `outcome` / `service` /
			// `duration_ms` via `.with({ ... })` cannot corrupt the
			// wide-event invariants that downstream queries depend on.
			// `error_code` and `user_id` are assigned unconditionally
			// (as potentially `undefined`) so a spoofed `error_code` in
			// `fields` is overwritten even on the happy path. Undefined
			// values are dropped by `JSON.stringify`, so the emitted
			// line still omits the key when no real value exists.
			const payload = {
				...fields,
				service,
				action,
				request_id: requestId,
				outcome,
				duration_ms: durationMs,
				error_code: errorCode,
				user_id: userId ?? undefined,
			};

			// `error`-level for non-ok outcomes so log drains can alert
			// on stderr independently. The payload shape is identical —
			// only the severity tag differs.
			if (outcome === 'ok') {
				logInfo('server_action', payload);
				return;
			}
			logError('server_action', payload);
		},
	};

	return event;
}

export interface WithWideEventContext {
	/** Domain name (e.g. `'payment'`, `'raffle'`) */
	readonly service: string;
	/** Action name — should match the server action filename */
	readonly action: string;
}

/**
 * Wrap a server action so it emits exactly one wide event on completion.
 *
 * Responsibilities:
 * 1. Generate a stable `request_id` for this invocation.
 * 2. Stamp the Sentry scope with `request_id`, `service`, `action` —
 *    any `captureException` inside the callback inherits these tags,
 *    closing the Sentry ↔ logs correlation loop without per-call-site
 *    boilerplate.
 * 3. Time the handler and emit the canonical log line with the final
 *    outcome: `ok` when the `ServiceResponse` is successful, `error`
 *    when it returned a domain error, `exception` when the callback
 *    threw before a `ServiceResponse` could be returned.
 *
 * Design deliberately keeps the callback free to follow the existing
 * service-action template (see `.claude/rules/services.md`) — it does
 * **not** replace `captureServiceError`, `trackServer`, or
 * `ServiceResponse`. It only adds the wide-event log line that
 * previous observability missed.
 *
 * @param ctx - Static domain + action identifiers
 * @param fn - Server-action body receiving the `WideEvent` builder
 * @returns Whatever the callback returned — passes through untouched
 */
export async function withWideEvent<R extends WideEventResult<string>>(
	ctx: WithWideEventContext,
	fn: (event: WideEvent) => Promise<R>,
): Promise<R> {
	const event = createWideEvent(ctx.service, ctx.action);

	// `withScope` isolates tag mutations to this invocation so a
	// concurrent server action running on the same Node process
	// doesn't pick up this call's `request_id`.
	return Sentry.withScope(async scope => {
		scope.setTag('request_id', event.requestId);
		scope.setTag('service', ctx.service);
		scope.setTag('action', ctx.action);

		try {
			const result = await fn(event);
			const outcome: Outcome = result.success ? 'ok' : 'error';
			event.emit(outcome, result.success ? undefined : result.error);
			return result;
		} catch (error) {
			// Only emit — do not capture. The server action body is
			// responsible for `captureServiceError`; double-capturing
			// here would splinter the Sentry issue fingerprint. The
			// log line is still emitted so the request is visible in
			// the log stream even if Sentry was skipped.
			event.emit('exception');
			throw error;
		}
	});
}
