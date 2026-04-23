'use server';

import { baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapVerificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES } from '@/types/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type TicketVerification,
	ticketVerificationSchema,
} from '@/types/verification';
import { ZodError } from 'zod';

/**
 * Verifies a ticket's existence and status in a raffle
 *
 * @param raffleId - The raffle ID or slug
 * @param ticketCode - The ticket code to verify
 * @returns ServiceResponse with verification data or error code
 */
export async function verifyTicket(
	raffleId: string,
	ticketCode: string,
): Promise<ServiceResponse<TicketVerification, VerificationErrorCode>> {
	try {
		const response = await baseClient.get(
			`/raffles/${pathParam(raffleId)}/verify-ticket/${pathParam(ticketCode)}`,
		);
		return success(ticketVerificationSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'verification', 'verify-ticket');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		return failure(mapVerificationError(error));
	}
}
