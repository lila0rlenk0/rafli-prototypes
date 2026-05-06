'use server';

import { z, ZodError } from 'zod';

import { PUBLIC_CREDIT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { failure, mapFanbasisPublicCreditError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import {
	FANBASIS_PUBLIC_CREDIT_ERROR_CODES,
	type FanbasisPublicCreditErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

// =============================================================================
// WIRE CONTRACT
// =============================================================================

/**
 * Embed-config payload returned by the backend. Mirrors
 * `FanbasisPublicCreditCheckoutResponseDto` in
 * `raffles-core-backend/src/payments/dto/fanbasis-public-credit-checkout.dto.ts`.
 *
 * The backend is the broker for the Fanbasis API key — the frontend
 * never sees it. `creatorId`, `productId`, and `environment` are also
 * server-owned so the FE cannot point the embedded SDK at a different
 * seller surface or flip into production by tampering with the response.
 *
 * Per the secret-mint doc, the backend returns only the four fields the
 * SDK needs to mount `<CheckoutProvider>` — no `id`, no `expiresAt`, no
 * correlation. Webhook handling and credit grants live downstream and
 * do not need a session id surfaced to the FE.
 */
const fanbasisPublicCreditCheckoutResponseSchema = z.object({
	checkoutSessionSecret: z.string().min(1),
	creatorId: z.string().min(1),
	environment: z.enum(['sandbox', 'production']),
	productId: z.string().min(1),
});

export type FanbasisPublicCreditCheckoutResponse = z.infer<
	typeof fanbasisPublicCreditCheckoutResponseSchema
>;

/**
 * Server-action input. Captcha token is required because the backend gates
 * the endpoint with Turnstile (audit H1 — card-testing surface mitigation).
 * Forwarded as `x-captcha-response` so the verifier reads it before the
 * Encore body parser runs and never logs it as part of a request payload.
 */
export interface CreateFanbasisCheckoutInput {
	readonly captchaToken: string;
}

const createFanbasisCheckoutInputSchema = z.object({
	captchaToken: z.string().min(1),
});

// =============================================================================
// SERVICE ACTION
// =============================================================================

/**
 * Mints a Fanbasis embedded-checkout session via the backend broker.
 *
 * Flow:
 *   1. Validate the captcha token shape — empty / missing fails fast
 *      without burning a backend round-trip.
 *   2. POST `/payments/fanbasis/public-credit-checkout` with the captcha
 *      token in the `x-captcha-response` header. The body stays empty —
 *      the embedded Fanbasis iframe collects email, card, and terms
 *      acceptance internally, so the session-mint endpoint receives no
 *      client-supplied data of its own.
 *   3. Validate response shape; surface drift to Sentry.
 *   4. Forward the embed config to the client component, which mounts
 *      `<CheckoutProvider>` + `<AutoCheckout>` from
 *      `@fanbasis/checkout-react`.
 *
 * Uses `baseClient` (no Bearer token) because the endpoint is
 * intentionally unauthenticated — the user has not yet signed up at
 * this point in the funnel. The client still injects the S2S secret so
 * the backend trusts `X-Client-IP` for rate-limit attribution.
 *
 * @param input - Cloudflare Turnstile token issued by the on-page widget
 * @returns ServiceResponse carrying the embed config on success, or a
 *   typed Fanbasis error code on failure. All failure paths capture in
 *   Sentry with a deterministic fingerprint; the caller should only
 *   show the error code through the toast map.
 */
export async function createFanbasisPublicCreditCheckout(
	input: CreateFanbasisCheckoutInput,
): Promise<
	ServiceResponse<
		FanbasisPublicCreditCheckoutResponse,
		FanbasisPublicCreditErrorCode
	>
> {
	// Step 0: Validate the captcha token shape. Treat empty as a hard
	// failure — there is no enumeration leak here (no email is involved
	// at this point in the funnel) so we surface a typed error and let
	// the card show a "complete the security check" prompt.
	const validatedInput = createFanbasisCheckoutInputSchema.safeParse(input);
	if (!validatedInput.success) {
		return failure(FANBASIS_PUBLIC_CREDIT_ERROR_CODES.FETCH_FAILED);
	}

	try {
		// Step 1: POST to the backend broker. `baseClient` handles the
		// `/api/v1` prefix, S2S secret, and `X-Client-IP` header. The body
		// is empty by design — the iframe collects email + card + terms.
		// Captcha token travels in the `x-captcha-response` header so the
		// verifier reads it ahead of the Encore body parser; the empty
		// JSON body is required so axios sends `Content-Length: 2` and
		// the Rust router routes to the POST handler instead of 405-ing.
		const response = await baseClient.post(
			'/payments/fanbasis/public-credit-checkout',
			{},
			{
				headers: { 'x-captcha-response': validatedInput.data.captchaToken },
				timeout: API_TIMEOUTS.MUTATION,
			},
		);

		// Step 2: Validate response shape. Drift surfaces as a generic
		// FETCH_FAILED toast while Sentry captures the precise issue path
		// for engineering — keeps users on a "try again" copy without
		// exposing internal contract churn.
		const parsed = fanbasisPublicCreditCheckoutResponseSchema.parse(
			response.data,
		);

		// Step 3: Funnel event. Identity is unauthenticated at this point;
		// no email is available pre-iframe-submit, and the backend's
		// secret-mint contract intentionally exposes no session id to the
		// FE — we record the bare event so the funnel still counts mints,
		// and Mixpanel's `CLAIMED` event later merges anonymous activity
		// with the authenticated user once the magic-link callback fires.
		void trackAfter(PUBLIC_CREDIT_EVENTS.CHECKOUT_STARTED, {});

		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(
				error,
				'payment',
				'create-fanbasis-public-credit-checkout',
			);
			void trackAfter(PUBLIC_CREDIT_EVENTS.CHECKOUT_FAILED, {
				error_code: FANBASIS_PUBLIC_CREDIT_ERROR_CODES.FETCH_FAILED,
			});
			return failure(FANBASIS_PUBLIC_CREDIT_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapFanbasisPublicCreditError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'create-fanbasis-public-credit-checkout',
		});
		void trackAfter(PUBLIC_CREDIT_EVENTS.CHECKOUT_FAILED, {
			error_code: errorCode,
		});
		return failure(errorCode);
	}
}
