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
 * Hosted-redirect URL minted by the backend broker. Mirrors
 * `FanbasisPublicCreditCheckoutResponseDto` in
 * `raffles-core-backend/src/payments/dto/fanbasis-public-credit-checkout.dto.ts`.
 *
 * Single field: `checkoutUrl` is the Fanbasis-issued `payment_link` the
 * client redirects to. The buyer enters email + card on Fanbasis's hosted
 * page; webhook delivery alone drives credit provisioning post-payment.
 */
const fanbasisPublicCreditCheckoutResponseSchema = z.object({
	checkoutUrl: z.url(),
});

export type FanbasisPublicCreditCheckoutResponse = z.infer<
	typeof fanbasisPublicCreditCheckoutResponseSchema
>;

/**
 * Server-action input.
 *
 * `captchaToken` is required because the backend gates the endpoint with
 * Turnstile (audit H1 — card-testing surface mitigation). Forwarded as
 * `x-captcha-response` so the verifier reads it before the Encore body
 * parser runs and never logs it as part of a request payload.
 *
 * `email` is the magic-link recipient. Captured on the FE so the
 * post-payment delivery target is locked to what the buyer typed here,
 * not whatever they (re)type on Fanbasis's hosted page. Validated client-
 * side first for fast UX, then revalidated server-side and forwarded as
 * Fanbasis session metadata for the webhook subscriber to consume.
 */
export interface CreateFanbasisCheckoutInput {
	readonly captchaToken: string;
	readonly email: string;
}

const createFanbasisCheckoutInputSchema = z.object({
	captchaToken: z.string().min(1),
	email: z.email(),
});

// =============================================================================
// SERVICE ACTION
// =============================================================================

/**
 * Mints a Fanbasis hosted-redirect checkout session via the backend broker.
 *
 * Flow:
 *   1. Validate the captcha token + email shape — empty/missing/malformed
 *      fails fast without burning a backend round-trip.
 *   2. POST `/payments/fanbasis/public-credit-checkout` with the captcha
 *      token in the `x-captcha-response` header and `{ email }` in the
 *      body. The backend forwards the email as Fanbasis session metadata
 *      so the post-payment webhook delivers the magic link to the address
 *      the buyer typed on our card, not whatever they retype on Fanbasis's
 *      hosted page. Card details are still captured upstream.
 *   3. Validate response shape; surface drift to Sentry.
 *   4. Return the URL; the client component performs a full-page navigation
 *      (`window.location.assign`) to send the buyer to Fanbasis.
 *
 * Uses `baseClient` (no Bearer token) because the endpoint is
 * intentionally unauthenticated — the user has not yet signed up at
 * this point in the funnel. The client still injects the S2S secret so
 * the backend trusts `X-Client-IP` for rate-limit attribution.
 *
 * @param input - Cloudflare Turnstile token issued by the on-page widget
 * @returns ServiceResponse carrying the hosted-redirect URL on success, or
 *   a typed Fanbasis error code on failure. All failure paths capture in
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
	// Step 0: Validate captcha + email shape. Both are hard failures
	// surfaced as `FETCH_FAILED` — the FE form blocks invalid emails
	// before submit, so a failure here means the inputs were tampered
	// with after the client validation gate. No enumeration leak: the
	// backend is also unauthenticated and has no per-email behavior at
	// this point in the funnel.
	const validatedInput = createFanbasisCheckoutInputSchema.safeParse(input);
	if (!validatedInput.success) {
		return failure(FANBASIS_PUBLIC_CREDIT_ERROR_CODES.FETCH_FAILED);
	}

	try {
		// Step 1: POST to the backend broker. `baseClient` handles the
		// `/api/v1` prefix, S2S secret, and `X-Client-IP` header. Body
		// carries the magic-link recipient email; card details are still
		// collected on Fanbasis's hosted page post-redirect. Captcha
		// token travels in the `x-captcha-response` header so the
		// verifier reads it ahead of the Encore body parser.
		const response = await baseClient.post(
			'/payments/fanbasis/public-credit-checkout',
			{ email: validatedInput.data.email },
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
		// no email is available pre-redirect, and no session id is
		// surfaced to the FE — we record the bare event so the funnel still
		// counts mints, and Mixpanel's `CLAIMED` event later merges
		// anonymous activity with the authenticated user once the
		// magic-link callback fires.
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
