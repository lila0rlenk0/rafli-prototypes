'use server';

import { baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapVerificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES } from '@/types/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type WinnerVerification,
	winnerVerificationSchema,
} from '@/types/verification';
import { ZodError } from 'zod';

/**
 * Verifies a winner's selection for a concluded raffle.
 *
 * @param raffleId - The raffle ID
 * @param position - The winner position (0-indexed, matching backend convention)
 * @returns ServiceResponse with verification data or error code
 */
export async function verifyWinner(
	raffleId: string,
	position: number,
): Promise<ServiceResponse<WinnerVerification, VerificationErrorCode>> {
	try {
		// Backend uses 0-indexed positions throughout (DB, API, responses).
		// Callers with human 1-indexed input must convert before calling.
		const response = await baseClient.get(
			`/raffles/${pathParam(raffleId)}/verify-winner/${pathParam(String(position))}`,
		);
		return success(winnerVerificationSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'verification', 'verify-winner');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		return failure(mapVerificationError(error));
	}
}
