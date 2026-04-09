'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapWalletError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { WALLET_ERROR_CODES, type WalletErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	walletsListResponseSchema,
	type WalletsListResponse,
} from '@/types/wallet';

/**
 * Fetches all linked wallets for the current user.
 * Used in crypto checkout to determine if wallet is already verified.
 *
 * @returns ServiceResponse with wallets list or error code
 */
export async function getWallets(): Promise<
	ServiceResponse<WalletsListResponse, WalletErrorCode>
> {
	try {
		// Step 1: Fetch linked wallets from backend
		const response = await authenticatedClient.get('/me/wallets', {
			timeout: API_TIMEOUTS.QUERY,
		});

		// Step 2: Validate response shape
		return success(walletsListResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'wallet', 'get-wallets');
			return failure(WALLET_ERROR_CODES.FETCH_FAILED);
		}

		// Wallet is a critical service — capture errors for Sentry alerting
		const errorCode = mapWalletError(error);
		captureServiceError(error, errorCode, {
			service: 'wallet',
			action: 'get-wallets',
		});
		return failure(errorCode);
	}
}
