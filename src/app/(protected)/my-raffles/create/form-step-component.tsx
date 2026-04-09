'use client';

import { useMultiStepForm } from './multi-step-form-provider';
import { STEPS } from './steps';

/**
 * Renders the active step of the raffle creation wizard.
 * Delegates to the step component registered in STEPS for the current index.
 *
 * @returns Form element wrapping the current step's component
 */
export function FormStepComponent() {
	const { currentStep: stepIndex, form, onSubmit } = useMultiStepForm();
	const { handleSubmit } = form;

	const currentStep = STEPS[stepIndex];

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="w-full">
			<currentStep.component />
		</form>
	);
}
