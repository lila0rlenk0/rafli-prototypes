import 'server-only';

import { redact } from './redact';

/**
 * Central structured logger.
 *
 * This is the only approved way to emit server-side log lines in Rafli.
 * Every call produces a single JSON object written to stdout — Vercel's
 * log drain forwards these to whichever aggregator is configured
 * (Better Stack, Datadog, Axiom, …). Because the output is structured,
 * queries can filter on `service:auth action:sign-in-user outcome:error`
 * without the "47 different ways to write a user id" problem
 * (https://loggingsucks.com).
 *
 * Design decisions — each is load-bearing, do not change without reading
 * `.claude/` logging rules first:
 *
 * - **Two levels, `info` and `error`.** Anything more granular
 *   (debug/warn/trace) becomes noise. If a message isn't worth paging on
 *   (`error`) or isn't a first-class business event (`info`), it
 *   shouldn't be in production logs — use Sentry breadcrumbs or a local
 *   dev `console.log` instead.
 * - **Wide events over scattered lines.** This module emits individual
 *   log lines; for request-level observability, use
 *   `@/lib/logger/wide-event` which accumulates context and emits one
 *   canonical event per server action. Prefer that pattern for any new
 *   code that spans more than a single synchronous step.
 * - **Always JSON.** No plaintext messages with interpolated values —
 *   interpolation is the anti-pattern that makes logs un-queryable.
 *   `logInfo('order failed', { orderId, errorCode })`, never
 *   `logInfo(\`order ${orderId} failed: ${errorCode}\`)`.
 * - **Base context auto-attached.** `env`, `release`, `region`, and
 *   `runtime` are baked into every line so a filter in the log UI can
 *   answer "errors on this specific deploy in us-east-1" without any
 *   call-site work.
 * - **Redaction before stringify.** Payloads go through `redact()`
 *   unconditionally. Cheaper than a bug that leaks a Bearer token.
 *
 * Forbidden elsewhere:
 * - raw `console.log` / `console.error` for business events — use this module
 * - string-concatenated log messages — use structured fields
 * - multiple log lines per request when one wide event would do
 */

/**
 * Application identifier baked into every log line as the `app` field.
 * Deliberately **not** named `service` — the wide-event module uses
 * `service` as the per-action *domain* tag (`auth`, `payment`, …),
 * matching the Sentry tag convention. Collapsing both into one field
 * would mean one name has to win and the other gets mangled by the
 * payload spread in `wide-event.ts#emit`. `app` stays unambiguous.
 */
const APP_NAME = 'raffly-web';

/**
 * Resolve the deployment environment label. Prefers `VERCEL_ENV`
 * (`production` | `preview` | `development`) over `NODE_ENV` because
 * Vercel preview deployments run with `NODE_ENV=production` but
 * represent staging traffic — conflating them in the log UI hides
 * preview regressions.
 *
 * @returns Normalized environment string
 */
function resolveEnv(): string {
	return (
		process.env.VERCEL_ENV ??
		process.env.NEXT_PUBLIC_APP_ENV ??
		process.env.NODE_ENV ??
		'development'
	);
}

/**
 * Resolve the release identifier. Vercel injects the commit SHA at
 * build time as `VERCEL_GIT_COMMIT_SHA`; this is the same value used
 * as `release` in `sentry.server.config.ts`, so Sentry issues and log
 * lines can be cross-referenced on a single field.
 *
 * @returns Commit SHA, or `unknown` outside Vercel (e.g. local dev)
 */
function resolveRelease(): string {
	return process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown';
}

/**
 * Resolve the runtime tag. Next.js sets `NEXT_RUNTIME` to `nodejs` for
 * the Node server and `edge` for middleware + edge handlers. Useful
 * for isolating edge-specific bugs (cold-start timing, API surface
 * differences) in log queries.
 *
 * @returns `nodejs` | `edge` | `unknown`
 */
function resolveRuntime(): string {
	return process.env.NEXT_RUNTIME ?? 'unknown';
}

/**
 * Resolve the Vercel region (e.g. `iad1`, `sfo1`). Absent locally.
 *
 * @returns Region code or `unknown`
 */
function resolveRegion(): string {
	return process.env.VERCEL_REGION ?? 'unknown';
}

interface BaseContext {
	readonly timestamp: string;
	readonly env: string;
	readonly release: string;
	readonly runtime: string;
	readonly region: string;
	readonly app: string;
}

/**
 * Assemble the invariant context applied to every log line. Called on
 * every emit so environment changes during a long-running Node process
 * are picked up without a restart (rare but happens in test envs).
 *
 * @returns Base context object merged into the final payload
 */
function baseContext(): BaseContext {
	return {
		timestamp: new Date().toISOString(),
		env: resolveEnv(),
		release: resolveRelease(),
		runtime: resolveRuntime(),
		region: resolveRegion(),
		app: APP_NAME,
	};
}

export type LogLevel = 'info' | 'error';

export interface LogFields {
	readonly [key: string]: unknown;
}

/**
 * Core write path. Builds the full payload, redacts, serializes, and
 * writes to the appropriate stream. Kept as a single narrow function so
 * every log emission goes through the same redaction + serialization
 * pipeline — there is no alternate path that could skip scrubbing.
 *
 * In non-production environments we emit pretty-printed output for
 * readability in `bun run dev`; production gets dense JSON optimized
 * for log-drain parsing.
 *
 * @param level - Severity tag (`info` | `error`)
 * @param msg - Human-readable short description (do not interpolate)
 * @param fields - Structured context
 */
function emit(level: LogLevel, msg: string, fields: LogFields): void {
	// Base context + level + msg spread AFTER user fields. A caller that
	// accidentally passes `release` / `env` / `level` in the fields
	// object must not be able to overwrite the values the log drain
	// (and Sentry correlation) relies on. Same invariant the wide-event
	// module enforces for its canonical fields — applied here too so
	// the guarantee is end-to-end.
	const payload = {
		...fields,
		...baseContext(),
		level,
		msg,
	};
	const scrubbed = redact(payload);
	const line =
		process.env.NODE_ENV === 'production'
			? JSON.stringify(scrubbed)
			: JSON.stringify(scrubbed, null, 2);

	// `stderr` for `error`, `stdout` for `info` — aligns with Unix
	// convention and lets log drains route severity independently.
	if (level === 'error') {
		process.stderr.write(`${line}\n`);
		return;
	}
	process.stdout.write(`${line}\n`);
}

/**
 * Emit an `info`-level structured event. Use for business events and
 * wide-event canonical log lines. Never for debugging chatter — that
 * belongs in dev-only `console.log`.
 *
 * @param msg - Short event name (e.g. `"server_action"`)
 * @param fields - Structured context merged into the payload
 */
export function logInfo(msg: string, fields: LogFields = {}): void {
	emit('info', msg, fields);
}

/**
 * Emit an `error`-level structured event. Use alongside
 * `captureServiceError` when the failure should appear in both Sentry
 * (with stack + grouping) and the log stream (with full request
 * context). The log line is not a substitute for Sentry — it's the
 * correlated request-level record.
 *
 * @param msg - Short event name (e.g. `"server_action"`)
 * @param fields - Structured context merged into the payload
 */
export function logError(msg: string, fields: LogFields = {}): void {
	emit('error', msg, fields);
}

/**
 * Canonical singleton the rest of the codebase imports. Matches the
 * "one logger instance configured at startup, imported everywhere"
 * guideline from the logging-best-practices skill.
 */
export const logger = {
	info: logInfo,
	error: logError,
} as const;
