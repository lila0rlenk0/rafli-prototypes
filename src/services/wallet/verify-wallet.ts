'use server';

import { ZodError } from 'zod';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { mapWalletError } from '@/lib/errors/error-mapper';
import { captureContractDrift } from '@/lib/sentry/capture';
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
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			'/me/wallets/verify',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const wallet = walletResponseSchema.parse(response.data);

		// Track wallet verified (awaited — important for crypto readiness metrics)
		await trackServer(
			ACCOUNT_EVENTS.WALLET_VERIFIED,
			{ chain: 'evm' },
			{ userId },
		);

		return success(wallet);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'wallet', 'verify-wallet');
			return failure(WALLET_ERROR_CODES.VALIDATION_FAILED);
		}

		return failure(mapWalletError(error));
	}
}
