'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapVerificationError } from '@/lib/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type WinnerVerification,
	winnerVerificationSchema,
} from '@/types/verification';
import { ZodError } from 'zod';

/**
 * Verifies a winner's selection for a concluded raffle
 *
 * @param raffleId - The raffle ID
 * @param position - The winner position (1-indexed)
 * @returns ServiceResponse with verification data or error code
 */
export async function verifyWinner(
	raffleId: string,
	position: number,
): Promise<ServiceResponse<WinnerVerification, VerificationErrorCode>> {
	try {
		const response = await baseClient.get(
			`/raffles/${raffleId}/verify-winner/${position}`,
		);
		const validated = winnerVerificationSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Winner verification validation failed:', error);
			return failure('validation_error');
		}
		return failure(mapVerificationError(error));
	}
}
