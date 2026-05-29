'use client';

import type { ComponentType } from 'react';
import type {
	FieldValues,
	SubmitErrorHandler,
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
	// Optional invalid handler. Without it react-hook-form silently swallows a
	// submit that fails validation — so a wizard's final submit button looks
	// dead when an invalid field lives on an earlier (off-screen) step. The
	// create wizard passes this to surface + navigate to the offending field;
	// the edit/verification wizards omit it and keep the prior behaviour.
	onInvalid?: SubmitErrorHandler<TValues>;
}

export function FormStep<TValues extends FieldValues>({
	steps,
	stepIndex,
	form,
	onSubmit,
	onInvalid,
}: FormStepProps<TValues>) {
	const CurrentStep = steps[stepIndex]?.component;
	if (!CurrentStep) return null;

	return (
		<form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="w-full">
			<CurrentStep />
		</form>
	);
}
