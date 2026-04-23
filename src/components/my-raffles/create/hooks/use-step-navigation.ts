'use client';

import { useCallback, useState } from 'react';

interface StepNavigation {
	currentStep: number;
	setCurrentStep: (step: number) => void;
	nextStep: () => void;
	previousStep: () => void;
	goToStep: (step: number) => void;
	isFirstStep: boolean;
	isLastStep: boolean;
}

/**
 * Wizard step state + navigation callbacks. Guards against underflow
 * and overflow at the boundaries so callers never need to gate their
 * own clicks.
 *
 * @returns Current step, step mutators, and the first/last flags.
 */
export function useStepNavigation(totalSteps: number): StepNavigation {
	const [currentStep, setCurrentStep] = useState(0);

	const nextStep = useCallback(() => {
		setCurrentStep(prev => (prev < totalSteps - 1 ? prev + 1 : prev));
	}, [totalSteps]);

	const previousStep = useCallback(() => {
		setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
	}, []);

	const goToStep = useCallback(
		(step: number) => {
			if (step >= 0 && step < totalSteps) setCurrentStep(step);
		},
		[totalSteps],
	);

	return {
		currentStep,
		setCurrentStep,
		nextStep,
		previousStep,
		goToStep,
		isFirstStep: currentStep === 0,
		isLastStep: currentStep === totalSteps - 1,
	};
}
