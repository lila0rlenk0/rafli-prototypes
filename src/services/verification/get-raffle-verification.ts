'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapVerificationError } from '@/lib/errors';
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
		const response = await baseClient.get(
			`/raffles/${raffleId}/verification`,
		);
		const validated = raffleVerificationDataSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Raffle verification validation failed:', error);
			return failure('validation_error');
		}
		return failure(mapVerificationError(error));
	}
}
