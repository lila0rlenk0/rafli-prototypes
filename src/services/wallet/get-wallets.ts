'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapWalletError } from '@/lib/errors/error-mapper';
import { captureContractDrift } from '@/lib/sentry/capture';
import { WALLET_ERROR_CODES, type WalletErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import type { WalletsListResponse } from '@/types/wallet';
import { walletsListResponseSchema } from '@/types/wallet';

/**
 * Fetches all linked wallets for the current user
 *
 * @returns ServiceResponse with wallets list or error code
 */
export async function getWallets(): Promise<
	ServiceResponse<WalletsListResponse, WalletErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/me/wallets', {
			timeout: API_TIMEOUTS.QUERY,
		});

		const data = walletsListResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'wallet', 'get-wallets');
			return failure(WALLET_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapWalletError(error));
	}
}
