'use client';

import { useEditForm } from './edit-form-provider';
import { STEPS } from './steps';

/**
 * FormStepComponent
 *
 * Renders the current step component based on the form state.
 * Wraps the step in a form that handles submission.
 */
export function FormStepComponent() {
	const { currentStep: stepIndex, form, onSubmit } = useEditForm();
	const { handleSubmit } = form;

	const currentStep = STEPS[stepIndex];

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="w-full">
			<currentStep.component />
		</form>
	);
}
