'use server';

import { baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapVerificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES } from '@/types/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type RaffleVerificationPayload,
	raffleVerificationDataSchema,
} from '@/types/verification';
import { ZodError } from 'zod';

/**
 * Fetches aggregated verification data for a raffle
 *
 * @param raffleId - The raffle ID or slug
 * @returns ServiceResponse with verification data or error code
 */
export async function getRaffleVerification(
	raffleId: string,
): Promise<ServiceResponse<RaffleVerificationPayload, VerificationErrorCode>> {
	try {
		const response = await baseClient.get(
			`/raffles/${pathParam(raffleId)}/verification`,
		);
		return success(raffleVerificationDataSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'verification', 'get-raffle-verification');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		return failure(mapVerificationError(error));
	}
}
