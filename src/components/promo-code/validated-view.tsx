'use client';

import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getPromoCodeDescription } from '@/lib/utils/format/promo-code-format';
import { type ValidatedPromoCode } from '@/types/promo-code';

interface PromoCodeValidatedViewProps {
	validatedPromo: ValidatedPromoCode;
	onRemove: () => void;
}

/**
 * Green confirmation chip shown after a promo code validates. Pulled
 * into its own component so the input orchestrator stays focused on
 * validation state and input handling.
 */
export function PromoCodeValidatedView({
	validatedPromo,
	onRemove,
}: PromoCodeValidatedViewProps) {
	return (
		<div className="rounded-lg border border-green-200 bg-green-50 p-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Check className="size-4 text-green-600" />
					<span className="font-mono text-sm font-medium text-green-800">
						{validatedPromo.code}
					</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={onRemove}
					className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
				>
					Remove
				</Button>
			</div>
			<p className="mt-1 text-sm text-green-700">
				{getPromoCodeDescription(validatedPromo)}
			</p>
		</div>
	);
}
