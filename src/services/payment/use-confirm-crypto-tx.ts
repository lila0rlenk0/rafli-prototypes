'use client';

import { useMutation } from '@tanstack/react-query';

import { confirmCryptoTx } from '@/services/payment/confirm-crypto-tx';
import type { CryptoTxMutationResponse } from '@/types/payment';
import type { PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import type { ConfirmCryptoTxPayload } from '@/types/wallet';

/**
 * React Query mutation wrapping `confirmCryptoTx`. The crypto checkout
 * effect calls `mutateAsync()` rather than the action directly so the
 * effect body never imports a `@/services/*` binding —
 * `local/no-useeffect-data-fetch` (data-fetching.md) bans that pattern.
 *
 * @returns React Query mutation handle
 */
export function useConfirmCryptoTx() {
	return useMutation<
		ServiceResponse<CryptoTxMutationResponse, PaymentErrorCode>,
		Error,
		ConfirmCryptoTxPayload
	>({
		mutationFn: payload => confirmCryptoTx(payload),
	});
}
