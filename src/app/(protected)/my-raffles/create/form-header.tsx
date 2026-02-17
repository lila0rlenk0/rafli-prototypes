'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMultiStepForm } from './multi-step-form-provider';

/**
 * FormHeader Component
 *
 * Displays the header for the raffle creation form with navigation controls.
 * Includes progress bar, previous step button, and exit button with draft save prompt.
 */
export function FormHeader() {
	const router = useRouter();
	const {
		currentStep,
		totalSteps,
		previousStep,
		hasUnsavedChanges,
		setShowExitModal,
	} = useMultiStepForm();

	const progress = ((currentStep + 1) / totalSteps) * 100;
	const isLastStep = currentStep === totalSteps - 1;

	const shouldDisablePreviousStep = currentStep === 0;

	/**
	 * Gets the header title based on the current step
	 */
	function getTitle(): string {
		if (isLastStep) return 'Preview a Raffle';
		return 'Create a Raffle';
	}

	/**
	 * Navigates to the previous form step
	 */
	function handlePreviousStep() {
		previousStep();
	}

	/**
	 * Handles exit button click
	 * Shows draft modal if there are unsaved changes, otherwise navigates directly
	 */
	function handleExitClick() {
		if (hasUnsavedChanges) {
			setShowExitModal(true);
		} else {
			router.push('/my-raffles');
		}
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="font-clash-display text-4xl font-semibold">
					{getTitle()}
				</h1>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={handlePreviousStep}
						disabled={shouldDisablePreviousStep}
					>
						Previous page
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleExitClick}
						aria-label="Exit form"
					>
						<X className="size-4" />
					</Button>
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
