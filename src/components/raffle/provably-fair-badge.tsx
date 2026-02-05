import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

interface ProvablyFairBadgeProps {
	className?: string;
	raffleId?: string;
}

/**
 * ProvablyFairBadge Component
 *
 * Compact trust signal badge for concluded raffles.
 * Indicates the raffle used verifiable random selection.
 * Links to verification page when raffleId provided.
 */
export function ProvablyFairBadge({
	className,
	raffleId,
}: ProvablyFairBadgeProps) {
	const content = (
		<>
			<ShieldCheck className="size-3" />
			Provably Fair
		</>
	);

	if (raffleId) {
		return (
			<Link
				href={`/verify/${raffleId}`}
				className={cn(
					'inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline',
					className,
				)}
			>
				{content}
			</Link>
		);
	}

	return (
		<div
			className={cn(
				'inline-flex items-center gap-1 text-xs text-green-600',
				className,
			)}
		>
			{content}
		</div>
	);
}
