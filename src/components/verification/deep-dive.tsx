'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { VerificationDeepDiveContent } from '@/components/verification/verification-deep-dive-content';
import { useRaffleVerification } from '@/services/verification/use-raffle-verification';

interface VerificationDeepDiveProps {
	raffleId: string;
}

export function VerificationDeepDive({ raffleId }: VerificationDeepDiveProps) {
	const { data, isLoading, isError } = useRaffleVerification(raffleId);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="size-8 animate-spin text-neutral-400" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
				<AlertCircle className="mx-auto mb-2 size-8 text-red-600" />
				<p className="text-red-600">Verification data not available</p>
				<Link
					href="/verify"
					className="mt-4 inline-block text-sm text-red-700 underline hover:no-underline"
				>
					Back to verification
				</Link>
			</div>
		);
	}

	return <VerificationDeepDiveContent data={data} />;
}
