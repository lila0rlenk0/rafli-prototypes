'use client';

import { useMultiStepForm } from './multi-step-form-provider';
import { STEPS } from './steps';

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
