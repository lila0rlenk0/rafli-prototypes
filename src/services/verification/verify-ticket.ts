'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapVerificationError } from '@/lib/errors';
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
			`/raffles/${raffleId}/verify-ticket/${ticketCode}`,
		);
		const validated = ticketVerificationSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Ticket verification validation failed:', error);
			return failure('validation_error');
		}
		return failure(mapVerificationError(error));
	}
}
