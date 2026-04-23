'use client';

import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/class-names';
import {
	VERIFICATION_STATUS,
	type VerificationStatus,
} from '@/types/verification-status';

interface VerificationBadgeProps {
	status: VerificationStatus;
	/** Shown in tooltip when rejected — explains why verification was declined */
	rejectionReason: string | null;
	className?: string;
}

/**
 * Colored pill badge for verification status.
 * - none/draft → null
 * - in_review → blue "Under Review" + tooltip + link to /verification
 * - approved → green "Verified" + checkmark
 * - rejected → red "Action Required" + tooltip + link to /verification
 */
export function VerificationBadge({
	status,
	rejectionReason,
	className,
}: VerificationBadgeProps) {
	// None and draft are not user-facing statuses — draft means the
	// submission is incomplete and hasn't been finalized yet
	if (
		status === VERIFICATION_STATUS.NONE ||
		status === VERIFICATION_STATUS.DRAFT
	) {
		return null;
	}

	// blue=in-progress, green=success, red=action-needed — matches existing badge conventions
	function getStatusClasses(): string {
		switch (status) {
			case VERIFICATION_STATUS.IN_REVIEW:
				return 'bg-blue-100 text-blue-700';
			case VERIFICATION_STATUS.APPROVED:
				return 'bg-green-100 text-green-700';
			case VERIFICATION_STATUS.REJECTED:
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getStatusLabel(): string {
		switch (status) {
			case VERIFICATION_STATUS.IN_REVIEW:
				return 'Under Review';
			case VERIFICATION_STATUS.APPROVED:
				return 'Verified';
			case VERIFICATION_STATUS.REJECTED:
				return 'Action Required';
			default:
				return status;
		}
	}

	// null → no tooltip needed (approved is self-explanatory)
	function getTooltipText(): string | null {
		switch (status) {
			case VERIFICATION_STATUS.IN_REVIEW:
				return 'Your documents are being reviewed. This usually takes 1–2 business days.';
			case VERIFICATION_STATUS.REJECTED:
				return (
					rejectionReason ||
					'Your verification was declined. Click to resubmit.'
				);
			default:
				return null;
		}
	}

	const badge = (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
				getStatusClasses(),
				className,
			)}
		>
			{/* Checkmark icon only for approved — visual confirmation of verified status */}
			{status === VERIFICATION_STATUS.APPROVED ? (
				<CheckCircle className="size-3" />
			) : null}
			{getStatusLabel()}
		</span>
	);

	const tooltipText = getTooltipText();

	// In review and rejected: wrap in tooltip + link to /verification
	if (tooltipText) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Link href="/verification" className="w-fit">
						{badge}
					</Link>
				</TooltipTrigger>
				<TooltipContent>{tooltipText}</TooltipContent>
			</Tooltip>
		);
	}

	return badge;
}
