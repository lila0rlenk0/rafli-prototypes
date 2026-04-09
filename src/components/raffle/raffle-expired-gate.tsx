'use client';

import { differenceInSeconds } from 'date-fns';
import { type ReactNode } from 'react';

import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';

interface RaffleExpiredGateProps {
	endAt: string;
	children: ReactNode;
}

/**
 * Hides children when raffle endAt time has passed.
 * Prevents purchase race conditions by client-side time check.
 */
export function RaffleExpiredGate({ endAt, children }: RaffleExpiredGateProps) {
	const { isExpired } = useRaffleSaleWindow(endAt);
	const hasAlreadyExpired =
		differenceInSeconds(new Date(endAt), new Date()) <= 0 || isExpired;

	if (hasAlreadyExpired) return null;
	return <>{children}</>;
}
