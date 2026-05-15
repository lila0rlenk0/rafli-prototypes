'use server';

import { z, ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import {
	failure,
	mapFanbasisPublicSubscriptionError,
	success,
} from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import {
	FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES,
	type FanbasisPublicSubscriptionErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

// =============================================================================
// WIRE CONTRACT
// =============================================================================

/**
 * Hosted-redirect URL minted by the backend broker. Mirrors
 * `FanbasisPublicSubscriptionCheckoutResponseDto` in
 * `raffles-core-backend/src/payments/dto/fanbasis-public-subscription-checkout.dto.ts`.
 *
 * Single field: `checkoutUrl` is the Fanbasis-issued `payment_link` the
 * client redirects to. The buyer enters card details on Fanbasis's hosted
 * page; the post-payment webhook drives subscription enrollment and the
 * magic-link delivery for new buyers.
 */
const fanbasisPublicSubscriptionCheckoutResponseSchema = z.object({
	checkoutUrl: z.url(),
});

export type FanbasisPublicSubscriptionCheckoutResponse = z.infer<
	typeof fanbasisPublicSubscriptionCheckoutResponseSchema
>;

/**
 * Server-action input.
 *
 * `captchaToken` is required because the backend gates the endpoint with
 * Turnstile (action `fanbasis-checkout`, cdata `fanbasis-public-subscription-v1`).
 * Forwarded as `x-captcha-response` so the verifier reads it before the
 * Encore body parser runs and never logs it as part of a request payload.
 *
 * `email` is the magic-link recipient for buyers without an account yet,
 * and the lookup key for existing users (which the backend silently rejects
 * via the `payments:fanbasis:checkout-failed` enumeration shield). Captured
 * on the FE so the post-payment delivery target is locked to what the buyer
 * typed here, not whatever they retype on Fanbasis's hosted page.
 *
 * `planSlug` selects the subscription tier the buyer is enrolling into. The
 * route layer pins this to a literal per landing page (`/subscribe-basic`,
 * `/subscribe-starter`, `/subscribe-pro`) so a tampered client can't request
 * a tier the funnel doesn't expose — the backend still re-validates against
 * `subscription_plans.slug` and rejects unknown values with
 * `payments:subscription:plan-not-found`.
 */
export interface CreateFanbasisPublicSubscriptionCheckoutInput {
	readonly captchaToken: string;
	readonly email: string;
	readonly planSlug: string;
}

const createFanbasisPublicSubscriptionCheckoutInputSchema = z.object({
	captchaToken: z.string().min(1),
	email: z.email(),
	// Snake-case lowercase ascii mirrors the backend DTO regex
	// (`/^[a-z0-9_]+$/`, ≤64 chars) so malformed slugs fail fast without a
	// backend round-trip.
	planSlug: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9_]+$/),
});

// =============================================================================
// SERVICE ACTION
// =============================================================================

/**
 * Mints a Fanbasis hosted-redirect subscription checkout session via the
 * backend broker for the plan identified by `planSlug`.
 *
 * Flow:
 *   1. Validate captcha + email + planSlug shapes — empty/missing/malformed
 *      fails fast without burning a backend round-trip. Backend revalidates
 *      with its own Zod schema, so this is purely the UX fast-fail layer.
 *   2. POST `/payments/fanbasis/public-subscription-checkout` with the
 *      captcha token in the `x-captcha-response` header and `{ email,
 *      planSlug }` in the body. The backend forwards the email as Fanbasis
 *      session metadata so the post-payment webhook delivers the magic link
 *      and creates the subscription enrollment against the address the
 *      buyer typed here. Card details are still collected upstream — our
 *      DOM never touches PAN data.
 *   3. Validate response shape; surface drift to Sentry.
 *   4. Return the URL; the client component performs a full-page navigation
 *      to send the buyer to Fanbasis.
 *
 * Uses `baseClient` (no Bearer token) because the endpoint is intentionally
 * unauthenticated — the buyer has not yet signed up at this point in the
 * funnel. The client still injects the S2S secret so the backend trusts
 * `X-Client-IP` for rate-limit and per-IP-cap attribution.
 *
 * @param input - Captcha token, magic-link email, and the plan slug the
 *   buyer is enrolling into (Basic / Starter / Pro)
 * @returns ServiceResponse carrying the hosted-redirect URL on success, or
 *   a typed Fanbasis public-subscription error code on failure. All failure
 *   paths capture in Sentry with a deterministic fingerprint; the caller
 *   should only show the error code through a toast map.
 */
export async function createFanbasisPublicSubscriptionCheckout(
	input: CreateFanbasisPublicSubscriptionCheckoutInput,
): Promise<
	ServiceResponse<
		FanbasisPublicSubscriptionCheckoutResponse,
		FanbasisPublicSubscriptionErrorCode
	>
> {
	// Step 0: Validate captcha + email shape. Both are hard failures
	// surfaced as `FETCH_FAILED` — the FE form blocks invalid emails before
	// submit, so a failure here means the inputs were tampered with after
	// the client validation gate. No enumeration leak: the backend is also
	// unauthenticated and has no per-email behavior at this point in the
	// funnel (existing-email collisions collapse onto the same opaque URN).
	const validatedInput =
		createFanbasisPublicSubscriptionCheckoutInputSchema.safeParse(input);
	if (!validatedInput.success) {
		return failure(FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
	}

	try {
		// Step 1: POST to the backend broker. `baseClient` handles the
		// `/api/v1` prefix, S2S secret, and `X-Client-IP` header. Body
		// carries the magic-link recipient email plus the plan slug picked
		// at the route level; card details are still collected on Fanbasis's
		// hosted page after the redirect. Captcha token travels in the
		// `x-captcha-response` header so the verifier reads it ahead of the
		// Encore body parser.
		const response = await baseClient.post(
			'/payments/fanbasis/public-subscription-checkout',
			{
				email: validatedInput.data.email,
				planSlug: validatedInput.data.planSlug,
			},
			{
				headers: { 'x-captcha-response': validatedInput.data.captchaToken },
				timeout: API_TIMEOUTS.MUTATION,
			},
		);

		// Step 2: Validate response shape. Drift surfaces as a generic
		// FETCH_FAILED toast while Sentry captures the precise issue path
		// for engineering — keeps users on a "try again" copy without
		// exposing internal contract churn.
		const parsed = fanbasisPublicSubscriptionCheckoutResponseSchema.parse(
			response.data,
		);

		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(
				error,
				'payment',
				'create-fanbasis-public-subscription-checkout',
			);
			return failure(FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapFanbasisPublicSubscriptionError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'create-fanbasis-public-subscription-checkout',
		});
		return failure(errorCode);
	}
}
