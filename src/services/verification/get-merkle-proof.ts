'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapVerificationError } from '@/lib/errors';
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
			`/raffles/${raffleId}/merkle-proof/${ticketId}`,
		);
		const validated = merkleProofSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Merkle proof validation failed:', error);
			return failure('validation_error');
		}
		return failure(mapVerificationError(error));
	}
}
