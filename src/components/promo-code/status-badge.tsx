'use client';

import { cn } from '@/lib/class-names';
import { getPromoCodeStatus } from '@/lib/utils/format/promo-code-format';
import {
	PROMO_CODE_STATUS,
	type PromoCode,
	type PromoCodeStatus,
} from '@/types/promo-code';

/**
 * Props for PromoCodeStatusBadge
 */
interface PromoCodeStatusBadgeProps {
	code: PromoCode;
	className?: string;
}

/**
 * Displays promo code status with color coding
 *
 * - active → green
 * - inactive → gray
 * - expired → red
 * - exhausted → amber
 */
export function PromoCodeStatusBadge({
	code,
	className,
}: PromoCodeStatusBadgeProps) {
	const status = getPromoCodeStatus(code);

	/**
	 * Returns Tailwind classes for status color
	 */
	function getStatusClasses(status: PromoCodeStatus): string {
		switch (status) {
			case PROMO_CODE_STATUS.ACTIVE:
				return 'bg-green-100 text-green-700';
			case PROMO_CODE_STATUS.INACTIVE:
				return 'bg-gray-100 text-gray-600';
			case PROMO_CODE_STATUS.EXPIRED:
				return 'bg-red-100 text-red-700';
			case PROMO_CODE_STATUS.EXHAUSTED:
				return 'bg-amber-100 text-amber-700';
			default:
				return 'bg-gray-100 text-gray-600';
		}
	}

	/**
	 * Returns display label for status
	 */
	function getStatusLabel(status: PromoCodeStatus): string {
		switch (status) {
			case PROMO_CODE_STATUS.ACTIVE:
				return 'Active';
			case PROMO_CODE_STATUS.INACTIVE:
				return 'Inactive';
			case PROMO_CODE_STATUS.EXPIRED:
				return 'Expired';
			case PROMO_CODE_STATUS.EXHAUSTED:
				return 'Exhausted';
			default:
				return status;
		}
	}

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
				getStatusClasses(status),
				className,
			)}
		>
			{getStatusLabel(status)}
		</span>
	);
}
