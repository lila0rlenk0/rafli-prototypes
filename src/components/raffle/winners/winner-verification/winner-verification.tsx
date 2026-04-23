'use client';

import { VerificationDetails } from '@/components/raffle/winners/winner-verification/details';
import { useWinnerVerification } from '@/services/verification/use-winner-verification';

import { VerifiedBadge } from '@/components/raffle/badges/verified-badge';

interface WinnerVerificationProps {
	raffleId: string;
	position: number;
	totalTickets?: number;
	manifestHash?: string | null;
	commitTxHash?: string | null;
}

/**
 * WinnerVerification — container that fetches verification data and
 * delegates presentation to `<VerifiedBadge>` + `<VerificationDetails>`.
 * `verified` stays `null` while the query is loading so the badge can
 * render an indeterminate state; derived from `merkleVerified` once data
 * arrives.
 */
export function WinnerVerification({
	raffleId,
	position,
	totalTickets,
	manifestHash,
	commitTxHash,
}: WinnerVerificationProps) {
	const { data: verification, isError } = useWinnerVerification(
		raffleId,
		position,
	);
	const verified = verification ? verification.merkleVerified : null;

	if (isError && !verification) {
		return <VerifiedBadge verified={false} />;
	}

	return (
		<div className="flex flex-col gap-2">
			<VerifiedBadge verified={verified} />
			{verification ? (
				<VerificationDetails
					verification={verification}
					totalTickets={totalTickets}
					manifestHash={manifestHash}
					commitTxHash={commitTxHash}
				/>
			) : null}
		</div>
	);
}
