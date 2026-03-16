'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapWalletError } from '@/lib/errors/error-mapper';
import { WALLET_ERROR_CODES, type WalletErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import type { VerifyWalletPayload, WalletResponse } from '@/types/wallet';
import { walletResponseSchema } from '@/types/wallet';

/**
 * Verifies and links an EVM wallet via EIP-191 signature
 *
 * @param payload - Address, signed message, signature, and timestamp
 * @returns ServiceResponse with verified wallet or error code
 */
export async function verifyWallet(
	payload: VerifyWalletPayload,
): Promise<ServiceResponse<WalletResponse, WalletErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			'/me/wallets/verify',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const wallet = walletResponseSchema.parse(response.data);
		return success(wallet);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Wallet verify response validation failed:', error);
			return failure(WALLET_ERROR_CODES.VALIDATION_FAILED);
		}

		return failure(mapWalletError(error));
	}
}
