'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useMultiStepForm } from './multi-step-form-provider';

export function FormHeader() {
	const { currentStep, totalSteps, previousStep } = useMultiStepForm();

	const progress = ((currentStep + 1) / totalSteps) * 100;

	const shouldDisablePreviousStep = currentStep === 0;

	function handlePreviousStep() {
		previousStep();
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="font-clash-display text-4xl font-semibold">
					Create a Raffle
				</h1>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={handlePreviousStep}
						disabled={shouldDisablePreviousStep}
					>
						Preview Page
					</Button>
					<X className="size-4" />
				</div>
			</div>

			<div className="relative my-4 h-2 w-full">
				<div className="absolute h-full w-full rounded-full bg-[#EEEEEE]" />
				<div
					className="bg-green absolute h-full max-w-full rounded-full"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</>
	);
}
