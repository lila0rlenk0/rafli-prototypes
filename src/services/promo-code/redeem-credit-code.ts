'use server';

import { revalidatePath } from 'next/cache';
import { ZodError, z } from 'zod';

import { PROMO_CODE_EVENTS } from '@/lib/analytics/events';
import { hashPromoCodeForAnalytics } from '@/lib/analytics/hash-sensitive';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { mapPromoCodeError } from '@/lib/errors/error-mapper';
import { failure, success } from '@/lib/errors/service-result';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	PROMO_CODE_ERROR_CODES,
	type PromoCodeErrorCode,
} from '@/types/errors';
import { PROMO_CODE_TYPE, promoCodeStringSchema } from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Account-scoped redemption payload — the credit-grant flow shares
 * `/api/v1/promo-codes/redeem` with raffle-bound flows but the BE rejects
 * any payload that smuggles `raffleId` / `orderId` for a credit_grant code
 * with `global:validation:invalid-payload`. Schema enforces the same
 * absence at the FE boundary so we never construct an illegal request.
 */
const redeemCreditCodePayloadSchema = z.object({
	code: promoCodeStringSchema,
});

/**
 * Credit-grant redemption response.
 *
 * - `type` is locked to `credit_grant` because this action is the only client
 *   surface that should ever drive the credit_grant branch — any other type
 *   coming back means a host-scoped raffle code was redeemed via the wrong
 *   path. Surface as Zod failure → `captureContractDrift` so the misuse is
 *   loud rather than silently rendering a bogus toast.
 * - `creditsGranted` and `balanceAfter` are decimal strings (NUMERIC(19,4) on
 *   the wire) — see `RedeemPromoCodeCommand.handleCreditGrantRedemption`.
 */
const redeemCreditCodeResponseSchema = z.object({
	redemptionId: z.string(),
	type: z.literal(PROMO_CODE_TYPE.CREDIT_GRANT),
	creditsGranted: z.string(),
	balanceAfter: z.string(),
});

export type RedeemCreditCodePayload = z.infer<
	typeof redeemCreditCodePayloadSchema
>;
export type RedeemCreditCodeResponse = z.infer<
	typeof redeemCreditCodeResponseSchema
>;

/**
 * Redeems a credit-grant promo code onto the user's platform balance.
 *
 * Distinct from `redeemPromoCode` because the BE's redeem endpoint reuses one
 * URL across four code types but accepts disjoint payload shapes per type:
 * raffle-scoped types require `raffleId` (and discount types also `orderId`),
 * while credit_grant rejects both. Splitting at the FE keeps the input schema
 * narrow and prevents a stray raffleId from triggering the BE's
 * `invalid-payload` guard.
 *
 * On success the profile page is path-revalidated so `CreditsSection` (server
 * component) re-renders with the new balance immediately on the next nav. The
 * client also invalidates the React-Query `['credits']` key for in-place
 * refresh — see `useRedeemCreditCode`.
 *
 * @param payload - `{ code }` only — additional fields will fail validation.
 * @returns ServiceResponse with redemption details (redemptionId, creditsGranted, balanceAfter) or a domain error code.
 */
export async function redeemCreditCode(
	payload: RedeemCreditCodePayload,
): Promise<ServiceResponse<RedeemCreditCodeResponse, PromoCodeErrorCode>> {
	// Dynamic import — mirrors `redeemPromoCode` so unit tests that import this
	// file before mocking `auth/session` keep the mock chain intact.
	const sessionPromise = import('@/lib/auth/session').then(m => m.getSession());

	try {
		// Step 1: Pre-validate at FE boundary so format mistakes return a typed
		// `invalid_code` (or fall through to FETCH_FAILED) without a network round trip.
		const validationResult = redeemCreditCodePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}

		// Step 2: Forward — `code` only. Sending raffleId/orderId here would
		// trigger the BE's `core:promo:host-cannot-redeem` / `invalid-payload`
		// guards on a credit_grant code. The promoCodeStringSchema preprocessor
		// has already trimmed + uppercased.
		const response = await authenticatedClient.post('/promo-codes/redeem', {
			code: validationResult.data.code,
		});

		// Step 3: Parse — strict-typed response narrows `type` to `credit_grant`.
		// Mismatch = caller hit the wrong endpoint with a non-credit code, so we
		// surface as ContractDrift rather than silently rendering an empty toast.
		const data = redeemCreditCodeResponseSchema.parse(response.data);

		// Step 4: Refresh the profile page's server-rendered credits card with
		// the new balance + history row. React Query handles the in-place
		// updates (see useRedeemCreditCode); this revalidation is for the next
		// hard navigation back to /profile.
		revalidatePath('/profile', 'page');

		const userId = (await sessionPromise)?.user?.id;

		// Step 5: Non-blocking analytics — same event as raffle-scoped redemption
		// so the BI funnel collapses both paths under one "Promo Code Redeemed"
		// metric. The `raffle_id: null` discriminator lets analysts split.
		await trackAfter(
			PROMO_CODE_EVENTS.REDEEMED,
			{
				code_fingerprint: hashPromoCodeForAnalytics(validationResult.data.code),
				raffle_id: null,
				type: data.type,
				credits_granted: data.creditsGranted,
			},
			{ userId },
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'redeem-credit-code');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapPromoCodeError(error);

		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			PROMO_CODE_EVENTS.REDEEM_FAILED,
			{
				code_fingerprint: hashPromoCodeForAnalytics(payload.code),
				raffle_id: null,
				error_code: errorCode,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
