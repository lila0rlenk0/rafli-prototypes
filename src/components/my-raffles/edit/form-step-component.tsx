'use client';

import { FormStep } from '@/components/my-raffles/shared/form-step';
import { useEditForm } from './form-provider';
import { STEPS } from './steps';

export function FormStepComponent() {
	const { currentStep: stepIndex, form, onSubmit } = useEditForm();
	return (
		<FormStep
			steps={STEPS}
			stepIndex={stepIndex}
			form={form}
			onSubmit={onSubmit}
		/>
	);
}
