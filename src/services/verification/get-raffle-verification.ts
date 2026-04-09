'use server';

import { baseClient } from '@/lib/api/client';
import { failure, mapVerificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES } from '@/types/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type RaffleVerificationData,
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
): Promise<ServiceResponse<RaffleVerificationData, VerificationErrorCode>> {
	try {
		const response = await baseClient.get(`/raffles/${raffleId}/verification`);
		const validated = raffleVerificationDataSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'verification', 'get-raffle-verification');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		return failure(mapVerificationError(error));
	}
}
