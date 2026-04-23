'use client';

import { useCallback } from 'react';

import { validatePromoCode } from '@/services/promo-code/validate-promo-code';
import type { PromoCodeErrorCode } from '@/types/errors';
import type { ValidatePromoCodeResponse } from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

type ValidateFn = (
	raffleId: string,
	code: string,
) => Promise<ServiceResponse<ValidatePromoCodeResponse, PromoCodeErrorCode>>;

/**
 * Stable callback wrapper around the `validatePromoCode` server action.
 * Components call this from inside `useEffect` without importing
 * `@/services/*` directly — `local/no-useeffect-data-fetch`
 * (data-fetching.md) bans that pattern.
 *
 * @returns Bound async callback
 */
export function useValidatePromoCode(): ValidateFn {
	return useCallback(function validateAction(raffleId, code) {
		return validatePromoCode(raffleId, code);
	}, []);
}
