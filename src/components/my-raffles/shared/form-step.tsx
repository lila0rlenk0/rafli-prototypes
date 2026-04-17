'use client';

import type { ComponentType } from 'react';
import type {
	FieldValues,
	SubmitHandler,
	UseFormReturn,
} from 'react-hook-form';

interface FormStepDefinition {
	component: ComponentType;
}

interface FormStepProps<TValues extends FieldValues> {
	steps: readonly FormStepDefinition[];
	stepIndex: number;
	form: UseFormReturn<TValues>;
	onSubmit: SubmitHandler<TValues>;
}

export function FormStep<TValues extends FieldValues>({
	steps,
	stepIndex,
	form,
	onSubmit,
}: FormStepProps<TValues>) {
	const CurrentStep = steps[stepIndex]?.component;
	if (!CurrentStep) return null;

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
			<CurrentStep />
		</form>
	);
}
