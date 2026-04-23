'use client';

import type { CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import { RAFFLE_STATUS } from '@/types/raffle';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useEditForm } from './form-provider';
import { PublishRaffleButton } from './publish-raffle-button';

/**
 * FormHeader Component for Edit Form
 *
 * Displays the header for the raffle edit form with navigation controls.
 * Includes progress bar, previous step button, and exit button.
 */
export function FormHeader() {
	const router = useRouter();
	const { currentStep, totalSteps, previousStep, originalRaffle } =
		useEditForm();

	const isDraft = originalRaffle.status === RAFFLE_STATUS.DRAFT;

	const progress = ((currentStep + 1) / totalSteps) * 100;
	// Runtime-computed width — Tailwind fractional `w-*` can't bind to a
	// derived percentage from form state.
	const progressStyle: CSSProperties = { width: `${progress}%` };

	const shouldDisablePreviousStep = currentStep === 0;

	/**
	 * Navigates to the previous form step
	 */
	function handlePreviousStep() {
		previousStep();
	}

	/**
	 * Handles exit button click
	 * Navigates back to my-raffles page
	 */
	function handleExitClick() {
		router.push('/my-raffles');
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="font-clash-display text-4xl font-semibold">
					Edit Sweepstakes
				</h1>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={handlePreviousStep}
						disabled={shouldDisablePreviousStep}
					>
						Previous page
					</Button>
					{isDraft ? <PublishRaffleButton /> : null}
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
				<div className="bg-ink-150 absolute h-full w-full rounded-full" />
				<div
					className="bg-green absolute h-full max-w-full rounded-full"
					style={progressStyle}
				/>
			</div>
		</>
	);
}
