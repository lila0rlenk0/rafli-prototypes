import { cn } from '@/lib/utils';
import {
	KYC_SUBMISSION_STATUS,
	type KycSubmissionStatus,
} from '@/types/kyc-submission';

/**
 * Props for KycStatusBadge
 */
interface KycStatusBadgeProps {
	status: KycSubmissionStatus;
	className?: string;
}

/**
 * Displays KYC submission status with color coding.
 * Follows the project's status badge pattern (OrderStatusBadge).
 *
 * - pending → yellow
 * - approved → green
 * - rejected → red
 *
 * @returns Colored status pill span
 */
export function KycStatusBadge({ status, className }: KycStatusBadgeProps) {
	/**
	 * Maps status to Tailwind color classes
	 */
	function getStatusClasses(): string {
		switch (status) {
			case KYC_SUBMISSION_STATUS.PENDING:
				return 'bg-yellow-100 text-yellow-700';
			case KYC_SUBMISSION_STATUS.APPROVED:
				return 'bg-green-100 text-green-700';
			case KYC_SUBMISSION_STATUS.REJECTED:
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	/**
	 * Maps status to display label
	 */
	function getStatusLabel(): string {
		switch (status) {
			case KYC_SUBMISSION_STATUS.PENDING:
				return 'Pending';
			case KYC_SUBMISSION_STATUS.APPROVED:
				return 'Approved';
			case KYC_SUBMISSION_STATUS.REJECTED:
				return 'Rejected';
			default:
				return status;
		}
	}

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
				getStatusClasses(),
				className,
			)}
		>
			{getStatusLabel()}
		</span>
	);
}
