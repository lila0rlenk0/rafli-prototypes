// Private helper — deliberately NOT a `'use server'` file. Marking it as one
// would expose `updateWinningStatusBase` as a client-callable RPC, and the
// `endpoint` parameter would let the browser POST to arbitrary backend paths.
// Instead this module is server-only by transitivity: it imports
// `authenticatedClient`, `getSession`, and `revalidateWinningPaths`, all of
// which are themselves server-only, so the bundler refuses to ship it to the
// client regardless.
import { ZodError } from 'zod';

import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { revalidateWinningPaths } from '@/lib/cache/revalidation';
import { failure, mapWinningError, success } from '@/lib/errors';
import { runAfter } from '@/lib/utils/run-after';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import type { WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { type Winning, winningSchema } from '@/types/winning';

/**
 * Contract drift + Sentry action tag — kebab-case, must match the public
 * action's filename. Keeping this as a literal union (not `string`) means
 * adding a new mutation here without wiring telemetry fails typecheck.
 */
type UpdateWinningStatusAction =
	| 'mark-sent'
	| 'mark-delivered'
	| 'confirm-received';

/**
 * Shared input for the base helper — caller supplies the already-resolved
 * backend endpoint plus the telemetry metadata needed for analytics and
 * error capture. `payload` is optional because two of the three status
 * mutations (mark-delivered, confirm-received) POST with an empty body.
 */
interface UpdateWinningStatusInput {
	/** Absolute backend path, e.g. `/winnings/:id/mark-sent` */
	endpoint: string;
	/** Optional request body — omitted for no-body POSTs */
	payload?: unknown;
	/** Telemetry tag — kebab-case action name. Sentry groups events by this. */
	action: UpdateWinningStatusAction;
	/** Mixpanel event name from `WINNING_EVENTS` for the success tracker */
	event: string;
	/**
	 * Error code returned when the backend response fails schema validation.
	 * Each action has its own drift code (`MARK_SENT_FAILED`,
	 * `MARK_DELIVERED_FAILED`, `CONFIRM_FAILED`) so UI can distinguish them.
	 */
	zodErrorCode: WinningErrorCode;
	/**
	 * Raffle public slug — used to revalidate the public raffle page. Optional
	 * because not all call sites have it (e.g. wizard flows before publish).
	 */
	publicSlug?: string;
}

/**
 * Shared implementation of the winning status-mutation server actions
 * (`markSent`, `markDelivered`, `confirmReceived`). All three follow an
 * identical POST → Zod parse → revalidate → track pipeline, differing only
 * in endpoint, payload, telemetry tag, and drift error code. Keeping the
 * logic in one place avoids the drift that occurred previously across three
 * near-duplicate files. Each public action remains a thin wrapper so
 * callers' import paths stay stable and Sentry still sees distinct
 * `action` tags on failures.
 *
 * Note: `claim-winning.ts` follows a similar shape but has different
 * semantics (transitions pending → awaiting_host with shipping info) and
 * is deliberately kept separate.
 *
 * @param input - Endpoint, payload, telemetry, and revalidation metadata
 * @returns ServiceResponse with the validated winning entity or an error code
 */
export async function updateWinningStatusBase(
	input: UpdateWinningStatusInput,
): Promise<ServiceResponse<Winning, WinningErrorCode>> {
	// Resolve session in parallel with the POST — we only need it for the
	// fire-and-forget analytics tracker on the success path, so blocking on
	// cookies would add latency to the host/winner UX for no reason.
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Hit the status-transition endpoint. Caller pre-built the path
		// because each action targets a different backend route and we don't
		// want this helper to own that routing logic.
		const response = await authenticatedClient.post(
			input.endpoint,
			input.payload,
		);

		// Step 2: Validate response shape — ZodError here is a contract drift
		// event, not a crash, so we route it through `captureContractDrift` in
		// the catch branch below.
		const validated = winningSchema.parse(response.data);

		// Step 3: Non-blocking revalidation — runs after the response so the
		// client isn't held up by cache tag invalidation.
		runAfter(() => {
			revalidateWinningPaths(input.publicSlug);
		});

		// Step 4: Non-blocking analytics — pre-resolve session + IP in request
		// scope (headers() is illegal inside after()), then defer Mixpanel send.
		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			input.event,
			{
				winning_id: validated.id,
				raffle_id: validated.raffleId,
			},
			{ userId },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			// Tag drift with the caller's action so Sentry groups
			// mark-sent / mark-delivered / confirm-received separately.
			captureContractDrift(error, 'winning', input.action);
			return failure(input.zodErrorCode);
		}

		// Step 5: Map and capture — prize-fulfillment failures must reach
		// Sentry with the same criticality as auth/payment: a stuck status
		// transition blocks the entire prize-release flow for the winner.
		const errorCode = mapWinningError(error);
		captureServiceError(error, errorCode, {
			service: 'winning',
			// Preserved from the per-file instrumentation added in commit a3c653f —
			// each action keeps its own Sentry tag, NOT a generic 'winning' tag.
			action: input.action,
		});
		return failure(errorCode);
	}
}
