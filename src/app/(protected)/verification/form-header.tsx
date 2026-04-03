'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { STEP_TITLES } from './constants';
import {
	SUBMISSION_PHASE,
	useVerificationForm,
} from './verification-form-provider';

/**
 * FormHeader Component
 *
 * Displays progress bar, step title, and navigation controls for the
 * verification multi-step form. Shows submission progress during the
 * submit-upload-finalize cycle.
 *
 * @returns Header with progress bar and navigation
 */
export function FormHeader() {
	const {
		currentStep,
		totalSteps,
		previousStep,
		isFirstStep,
		isSubmitting,
		submissionPhase,
	} = useVerificationForm();

	const progress = ((currentStep + 1) / totalSteps) * 100;

	/**
	 * Gets the submission phase label shown during the async submission flow
	 */
	function getPhaseLabel(): string | null {
		switch (submissionPhase) {
			case SUBMISSION_PHASE.SUBMITTING:
				return 'Submitting your information...';
			case SUBMISSION_PHASE.UPLOADING:
				return 'Uploading documents...';
			case SUBMISSION_PHASE.FINALIZING:
				return 'Finalizing submission...';
			default:
				return null;
		}
	}

	const phaseLabel = getPhaseLabel();

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="font-clash-display text-3xl font-semibold">
					{STEP_TITLES[currentStep]}
				</h1>

				<div className="flex items-center gap-2">
					{!isFirstStep && !isSubmitting && (
						<Button variant="outline" onClick={previousStep}>
							<ArrowLeft data-icon="inline-start" />
							Previous
						</Button>
					)}
					{isFirstStep && (
						<Button asChild variant="outline">
							<Link href="/">Cancel</Link>
						</Button>
					)}
				</div>
			</div>

			<div className="relative my-4 h-2 w-full">
				<div className="bg-muted absolute h-full w-full rounded-full" />
				<div
					className="bg-green absolute h-full max-w-full rounded-full transition-all duration-300"
					style={{ width: `${progress}%` }}
				/>
			</div>

			{phaseLabel && (
				<div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
					<Spinner className="size-4" />
					{phaseLabel}
				</div>
			)}
		</>
	);
}
