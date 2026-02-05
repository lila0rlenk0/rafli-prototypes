import { Ticket } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Props for PromoCodesEmptyState
 */
interface PromoCodesEmptyStateProps {
	onCreateClick?: () => void;
	isReadOnly?: boolean;
}

/**
 * Empty state displayed when no promo codes exist
 */
export function PromoCodesEmptyState({
	onCreateClick,
	isReadOnly = false,
}: PromoCodesEmptyStateProps) {
	// Step 1: Render empty state with optional CTA.
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
				<Ticket className="size-8 text-gray-400" />
			</div>

			<h3 className="text-lg font-semibold text-gray-900">
				No promo codes yet
			</h3>

			<p className="mt-1 max-w-sm text-sm text-gray-500">
				{isReadOnly
					? 'No promo codes were created for this raffle.'
					: 'Create one to offer discounts or free tickets to participants.'}
			</p>

			{!isReadOnly && onCreateClick && (
				<Button onClick={onCreateClick} className="mt-4">
					Create Promo Code
				</Button>
			)}
		</div>
	);
}
