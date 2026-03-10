'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapWalletError } from '@/lib/errors/error-mapper';
import type { WalletErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Unlinks a wallet by address
 *
 * @param address - The wallet address to unlink
 * @returns ServiceResponse with success flag or error code
 */
export async function unlinkWallet(
	address: string,
): Promise<ServiceResponse<{ success: boolean }, WalletErrorCode>> {
	try {
		await authenticatedClient.delete(`/me/wallets/${address}`, {
			timeout: API_TIMEOUTS.MUTATION,
		});

		return success({ success: true });
	} catch (error) {
		return failure(mapWalletError(error));
	}
}
