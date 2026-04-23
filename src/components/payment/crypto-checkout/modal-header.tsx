'use client';

import { ArrowLeft } from 'lucide-react';

import {
	getCheckoutStepTitle,
	getStepNumber,
	getTotalSteps,
	wasTokenStepShown,
	type CheckoutStep,
} from '@/components/payment/crypto-checkout/steps/step-progress';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CheckoutModalHeaderProps {
	step: CheckoutStep;
	selectedChainId: number | null;
	tokenCountForSelectedChain: number;
	hasSelectableChains: boolean;
	onBack: () => void;
}

/**
 * Dialog header with back arrow + animated step-progress dots.
 *
 * Extracted so the parent modal can stay under the 150-LOC cap. All of the
 * progress math lives in the pure helpers in `step-progress.ts`; this
 * component is only the JSX envelope.
 *
 * @param props - Step state + back handler
 * @returns The header JSX for `DialogContent`
 */
export function CheckoutModalHeader({
	step,
	selectedChainId,
	tokenCountForSelectedChain,
	hasSelectableChains,
	onBack,
}: CheckoutModalHeaderProps) {
	const tokenShown = wasTokenStepShown(
		selectedChainId,
		tokenCountForSelectedChain,
	);
	const stepNumber = getStepNumber(step, {
		tokenStepShown: tokenShown,
		hasSelectableChains,
	});
	const totalSteps = getTotalSteps({ tokenStepShown: tokenShown });
	const showBackButton = stepNumber >= 2;
	const titleClass = showBackButton
		? 'font-clash-display text-xl pl-7'
		: 'font-clash-display text-xl';

	return (
		<DialogHeader className="relative">
			{showBackButton ? (
				<button
					type="button"
					onClick={onBack}
					className="text-ink-500 absolute top-0.5 left-0 rounded-full p-1 transition-colors hover:bg-gray-100 hover:text-black"
					aria-label="Go back"
				>
					<ArrowLeft className="size-4" />
				</button>
			) : null}
			<DialogTitle className={titleClass}>
				{getCheckoutStepTitle(step, { hasSelectableChains })}
			</DialogTitle>
			{stepNumber > 0 ? (
				<div className="flex items-center justify-center gap-1.5 pt-1">
					{Array.from({ length: totalSteps }, (_, i) => i + 1).map(n => (
						<div
							key={n}
							className={
								n <= stepNumber
									? 'h-1 w-6 rounded-full bg-black transition-all duration-300'
									: 'bg-ink-200 h-1 w-1.5 rounded-full transition-all duration-300'
							}
						/>
					))}
				</div>
			) : null}
		</DialogHeader>
	);
}
