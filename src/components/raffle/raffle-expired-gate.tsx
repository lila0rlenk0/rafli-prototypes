'use client';

import { differenceInSeconds } from 'date-fns';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

interface RaffleExpiredGateProps {
	endAt: string;
	children: ReactNode;
}

/**
 * Hides children when raffle endAt time has passed.
 * Prevents purchase race conditions by client-side time check.
 */
export function RaffleExpiredGate({ endAt, children }: RaffleExpiredGateProps) {
	const [expired, setExpired] = useState(
		() => differenceInSeconds(new Date(endAt), new Date()) <= 0,
	);

	const checkExpiry = useCallback(() => {
		if (differenceInSeconds(new Date(endAt), new Date()) <= 0) {
			setExpired(true);
		}
	}, [endAt]);

	useEffect(() => {
		if (expired) return;
		const interval = setInterval(checkExpiry, 1_000);
		return () => clearInterval(interval);
	}, [expired, checkExpiry]);

	if (expired) return null;
	return <>{children}</>;
}
