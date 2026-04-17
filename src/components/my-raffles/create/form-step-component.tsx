'use client';

import { FormStep } from '@/components/my-raffles/shared/form-step';
import { useMultiStepForm } from './multi-step-form-provider';
import { STEPS } from './steps';

export function FormStepComponent() {
	const { currentStep: stepIndex, form, onSubmit } = useMultiStepForm();
	return (
		<FormStep
			steps={STEPS}
			stepIndex={stepIndex}
			form={form}
			onSubmit={onSubmit}
		/>
	);
}
