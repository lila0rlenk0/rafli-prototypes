'use client';

import { useMemo } from 'react';

import { computeRestrictions } from '@/lib/utils/raffle/raffle-restrictions';
import type { FieldRestrictions } from '@/lib/validation/raffle/edit-form-schema';
import type { Raffle } from '@/types/raffle';

/**
 * Memoized derivation of edit-mode field restrictions from the
 * raffle's current state. `computeRestrictions` is pure — this hook
 * just gates the recompute against the raffle identity so consumers
 * don't re-run derivation during typical form interactions (the
 * raffle prop only changes on a page navigation).
 *
 * @returns The field restrictions (priceLocked, startDateLocked).
 */
export function useEditRestrictions(raffle: Raffle): FieldRestrictions {
	return useMemo(() => computeRestrictions(raffle), [raffle]);
}
