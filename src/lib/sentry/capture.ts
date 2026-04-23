import * as Sentry from '@sentry/nextjs';
import type { Scope } from '@sentry/nextjs';
import type { ZodError } from 'zod';

import { EXPECTED_ERROR_CODES } from '@/lib/sentry/filter';

/**
 * Structured context attached to every `captureServiceError` call.
 *
 * `service` and `action` are required and promoted to indexed Sentry tags
 * so the issue list is filterable (`service:payment action:submit-crypto-tx`).
 * Everything else is optional domain metadata — entity IDs and non-PII
 * intent markers — and lands in the non-indexed `service` context block
 * for debugging a single event.
 *
 * Keep this shape narrow: any field added here gets fingerprinted
 * implicitly via the call-site and should be either filterable (a tag) or
 * diagnostic (a context value). Never include user identifiers or PII
 * here — user attribution comes from `setSentryUser` via `getSession()`.
 */
export interface ServiceErrorContext {
	/** Domain name (e.g. 'payment', 'raffle', 'comment') — indexed as a tag */
	readonly service: string;
	/** Action name matching the server action file (e.g. 'submit-crypto-tx') — indexed as a tag */
	readonly action: string;

	// Entity IDs — any that exist at the call site. All optional so
	// existing callers that only pass service+action continue to compile.
	readonly raffleId?: string;
	readonly orderId?: string;
	readonly sessionId?: string;
	readonly commentId?: string;
	readonly submissionId?: string;
	readonly updateId?: string;
	readonly txHash?: string;
	readonly walletAddress?: string;

	// Non-PII intent metadata — useful for reproducing payment/crypto bugs.
	readonly quantity?: number;
	readonly chainId?: number;
}

/**
 * Captures client-originated errors from React error boundaries.
 * Server errors carry a `digest` and are already captured by `onRequestError`
 * in `instrumentation.ts` — capturing them again would create duplicates.
 *
 * @param error - Error from the error boundary props
 */
export function captureErrorBoundary(error: Error & { digest?: string }): void {
	if (!error.digest) {
		Sentry.captureException(error);
	}
}

/**
 * Captures a service error in Sentry with structured context.
 *
 * Behavior:
 * - Drops expected business errors early via `EXPECTED_ERROR_CODES` to
 *   avoid building a Sentry scope at all for known user-path errors.
 * - Tags `errorCode`, `service`, `action` as indexed Sentry tags so the
 *   issue list in the UI can be filtered and grouped without opening
 *   each event.
 * - Sets a deterministic fingerprint `['service-error', service, action,
 *   errorCode]` so similar failures collapse into a single Sentry issue
 *   instead of splintering across minor stack variations. This is the
 *   dominant lever for keeping the issue inbox tractable — a contract
 *   change or upstream regression creates one issue, not twenty.
 * - Attaches the full `ServiceErrorContext` as a non-indexed context
 *   block so entity IDs, quantities, and chain IDs are visible when
 *   debugging a single event.
 *
 * The `beforeSend` filter in `filter.ts` uses the `errorCode` tag to drop
 * expected errors as a second-line defence if new codes are added without
 * updating `EXPECTED_ERROR_CODES`.
 *
 * @param error - Original caught error
 * @param errorCode - Typed error code from the domain error mapper
 * @param context - Required `{ service, action }` plus optional entity IDs
 */
export function captureServiceError(
	error: unknown,
	errorCode: string,
	context: ServiceErrorContext,
): void {
	// Skip expected business/user errors — avoids building Sentry scope entirely,
	// saving CPU and guaranteeing zero quota usage for known error codes.
	if (!shouldCaptureServiceError(errorCode)) return;

	Sentry.withScope(scope => {
		applyServiceErrorScope(scope, errorCode, context);
		Sentry.captureException(error);
	});
}

/**
 * Pure predicate deciding whether a service error should reach Sentry.
 *
 * Extracted from `captureServiceError` so the short-circuit behavior is
 * unit-testable without mocking `@sentry/nextjs`. Returns `false` for
 * codes inside `EXPECTED_ERROR_CODES` — known user-path errors that
 * would otherwise burn quota (invalid credentials, sold out, etc.) —
 * and `true` for everything else.
 *
 * `beforeSend` applies the same rule as a second-line defense in case
 * a new expected code is added without updating this set.
 *
 * @param errorCode - Typed error code from the domain error mapper
 * @returns `true` when the error should be reported to Sentry
 */
export function shouldCaptureServiceError(errorCode: string): boolean {
	return !EXPECTED_ERROR_CODES.has(errorCode);
}

/**
 * Writes the service-error contract onto a Sentry scope.
 *
 * Extracted from `captureServiceError` so unit tests can verify the tag /
 * fingerprint / context layout without spinning up a mocked Sentry SDK —
 * the test passes a fake scope that records every mutation, which is far
 * more reliable than `mock.module('@sentry/nextjs')` under Bun's
 * process-wide module cache.
 *
 * Keep this in sync with `captureServiceError` above: anything added here
 * must ship with the corresponding unit test assertion.
 *
 * @param scope - The Sentry scope to mutate (usually from `Sentry.withScope`)
 * @param errorCode - Typed error code from the domain error mapper
 * @param context - Structured context with `service`, `action`, entity IDs
 */
export function applyServiceErrorScope(
	scope: Scope,
	errorCode: string,
	context: ServiceErrorContext,
): void {
	// Indexed tags — filterable and groupable in the Sentry issue list
	scope.setTag('errorCode', errorCode);
	scope.setTag('service', context.service);
	scope.setTag('action', context.action);
	scope.setLevel('error');

	// Deterministic grouping: every failure of `service/action` with the
	// same `errorCode` collapses into one issue. Without this, Sentry
	// groups by stack frame hash — a tiny change in an upstream library
	// or a different in-flight retry path explodes one logical failure
	// into many issues that all need the same fix.
	scope.setFingerprint([
		'service-error',
		context.service,
		context.action,
		errorCode,
	]);

	// Non-indexed context — visible on each event but not filterable.
	// Defensive spread so a caller that mutates `context` after capture
	// (e.g. reusing the payload object for a retry) cannot corrupt the
	// already-captured event's context.
	scope.setContext('service', { ...context });
}

/**
 * Captures a Zod validation failure on an API response.
 *
 * These indicate **contract drift** — the backend changed its response shape
 * without a corresponding frontend update. This is a critical infrastructure
 * signal (not a user error) and should always reach Sentry.
 *
 * @param error - ZodError from `.parse()` on the API response
 * @param service - Domain name (e.g. "payment", "raffle")
 * @param action - Server action name (e.g. "pay-with-credits")
 */
export function captureContractDrift(
	error: ZodError,
	service: string,
	action: string,
): void {
	Sentry.withScope(scope => {
		applyContractDriftScope(scope, error, { service, action });
		Sentry.captureException(error);
	});
}

export interface ContractDriftContext {
	/** Domain name (e.g. 'payment', 'raffle'). */
	service: string;
	/** Server action name within the domain. */
	action: string;
}

/**
 * Writes the contract-drift contract onto a Sentry scope. Extracted for
 * the same reason as `applyServiceErrorScope` — lets unit tests verify
 * the tag / fingerprint / context layout without mocking Sentry.
 *
 * @param scope - The Sentry scope to mutate
 * @param error - ZodError from `.parse()` on the API response
 * @param ctx - Domain + action bundle identifying the drift source
 */
export function applyContractDriftScope(
	scope: Scope,
	error: ZodError,
	ctx: ContractDriftContext,
): void {
	const { service, action } = ctx;
	scope.setTag('errorCode', 'contract_drift');
	scope.setTag('service', service);
	scope.setTag('action', action);
	scope.setLevel('error');

	// Group all contract drift for a given (service, action) into one
	// issue. Zod typically reports multiple field mismatches that would
	// otherwise bucket into several issues per deploy. One issue per
	// endpoint makes tracking "which API contract drifted" trivial.
	scope.setFingerprint(['contract-drift', service, action]);

	// Attach the Zod issue array so the exact field mismatches are visible in Sentry
	scope.setContext('zodIssues', {
		issues: error.issues.map(issue => ({
			path: issue.path.join('.'),
			code: issue.code,
			message: issue.message,
		})),
	});
}
