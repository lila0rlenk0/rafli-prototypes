'use server';

import { baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapVerificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES } from '@/types/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { ServiceResponse } from '@/types/service-response';
import { type MerkleProof, merkleProofSchema } from '@/types/verification';
import { ZodError } from 'zod';

/**
 * Fetches Merkle proof for a specific ticket in a raffle
 *
 * @param raffleId - The raffle ID
 * @param ticketId - The ticket ID to get proof for
 * @returns ServiceResponse with Merkle proof data or error code
 */
export async function getMerkleProof(
	raffleId: string,
	ticketId: number,
): Promise<ServiceResponse<MerkleProof, VerificationErrorCode>> {
	try {
		const response = await baseClient.get(
			`/raffles/${pathParam(raffleId)}/merkle-proof/${pathParam(String(ticketId))}`,
		);
		return success(merkleProofSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'verification', 'get-merkle-proof');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		return failure(mapVerificationError(error));
	}
}
