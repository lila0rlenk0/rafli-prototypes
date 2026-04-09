/**
 * Server Action Logging Wrapper
 *
 * Higher-order function that wraps any server action to emit a wide event
 * on completion. Handles timing, user context, error classification,
 * and tail sampling automatically.
 *
 * Usage:
 * ```ts
 * export const getRaffle = withLogging('raffle', 'get-raffle', getRaffleImpl);
 * ```
 */

import { AxiosError } from 'axios';
import { ZodError } from 'zod';

import { getClientIp } from '@/lib/api/client';
import { getCurrentUser } from '@/lib/auth/session';
import type { ServiceResponse } from '@/types/service-response';

import { createWideEvent, emitWideEvent, type ErrorSource } from './event';
import { shouldSample } from './sampling';

/**
 * Classifies the error source for the wide event.
 * Distinguishes between Zod validation failures (contract drift),
 * API errors (backend returned an error), and network issues.
 *
 * @param error - Caught error from the service action
 * @returns ErrorSource classification
 */
function classifyError(error: unknown): ErrorSource {
	if (error instanceof ZodError) return 'zod';

	if (error instanceof AxiosError) {
		// Has a response → backend returned an error status
		if (error.response) return 'api';
		// No response → network/timeout issue
		return 'network';
	}

	return 'unknown';
}

/**
 * Extracts HTTP status and retry count from Axios errors.
 * Returns nulls for non-Axios errors.
 *
 * @param error - Caught error
 * @returns Tuple of [httpStatus, retryCount]
 */
function extractAxiosMeta(error: unknown): [number | null, number | null] {
	if (!(error instanceof AxiosError)) return [null, null];

	const status = error.response?.status ?? null;
	// __retryCount is set by the retry interceptor in @/lib/api/client.ts (RetryableConfig)
	const retryCount =
		(error.config as { __retryCount?: number } | undefined)?.__retryCount ??
		null;

	return [status, retryCount];
}

/**
 * Wraps a server action to emit a wide event on every invocation.
 *
 * Automatically collects: requestId, userId, clientIp, duration, error classification.
 * The wrapped action's ServiceResponse determines success/failure fields.
 *
 * Business-specific context (orderId, raffleId, etc.) can be added by passing
 * `context` to the options parameter.
 *
 * @param service - Domain name (e.g. "payment", "raffle")
 * @param action - Server action name (e.g. "pay-with-credits")
 * @param fn - The actual server action implementation
 * @param options - Optional static context fields to include in every event
 * @returns Wrapped function with identical signature and return type
 */
export function withLogging<
	TArgs extends unknown[],
	TData,
	TError extends string,
>(
	service: string,
	action: string,
	fn: (...args: TArgs) => Promise<ServiceResponse<TData, TError>>,
	options?: { context?: Record<string, unknown> },
): (...args: TArgs) => Promise<ServiceResponse<TData, TError>> {
	return async function logged(
		...args: TArgs
	): Promise<ServiceResponse<TData, TError>> {
		// Step 1: Initialize the wide event with a unique request ID and start timer.
		const event = createWideEvent(crypto.randomUUID(), service, action);
		const start = performance.now();

		// Step 2: Collect user context and client IP in parallel.
		// getCurrentUser is React.cache'd — zero cost if already called this request.
		const [user, clientIp] = await Promise.all([
			getCurrentUser().catch(() => null),
			getClientIp().catch(() => null),
		]);

		event.userId = user?.id ?? null;
		event.clientIp = clientIp;

		// Step 3: Merge caller-supplied static fields (orderId, raffleId, etc.) into extras bag.
		const staticContext = options?.context;
		if (staticContext) {
			Object.assign(event.extras, staticContext);
		}

		try {
			// Step 4: Execute the wrapped server action.
			const result = await fn(...args);

			event.success = result.success;
			event.errorCode = result.success ? null : result.error;

			return result;
		} catch (error) {
			// Step 4b: Capture unhandled exceptions (server actions should return ServiceResponse,
			// but if they throw, classify the error for observability).
			event.success = false;
			event.errorSource = classifyError(error);

			const [httpStatus, retryCount] = extractAxiosMeta(error);
			event.httpStatus = httpStatus;
			event.retryCount = retryCount;

			throw error;
		} finally {
			// Step 5: Record duration and emit the event if it passes tail sampling.
			event.durationMs = Math.round(performance.now() - start);

			if (shouldSample(event)) {
				emitWideEvent(event);
			}
		}
	};
}
