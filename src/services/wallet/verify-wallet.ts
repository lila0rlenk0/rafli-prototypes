'use server';

import { ZodError } from 'zod';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapWalletError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
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
	const sessionPromise = getSession();

	try {
		// Step 1: Submit EIP-191 signed payload for backend verification
		const response = await authenticatedClient.post(
			'/me/wallets/verify',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 2: Validate response shape
		const wallet = walletResponseSchema.parse(response.data);

		// Step 3: Non-blocking analytics — wallet verification success
		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
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

		const errorCode = mapWalletError(error);

		// Wallet is a critical service — capture for Sentry alerting
		captureServiceError(error, errorCode, {
			service: 'wallet',
			action: 'verify-wallet',
			walletAddress: payload.address,
		});

		// Track wallet verification failure — measures Web3 onboarding friction
		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			ACCOUNT_EVENTS.WALLET_VERIFICATION_FAILED,
			{
				chain: 'evm',
				error_code: errorCode,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
