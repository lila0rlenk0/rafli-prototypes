'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React, { createContext, useContext, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { raffleFormSchema } from './schema';
import { STEPS } from './steps';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

interface MultiStepFormContextType {
	currentStep: number;
	totalSteps: number;
	form: UseFormReturn<RaffleFormData>;
	nextStep: () => void;
	previousStep: () => void;
	goToStep: (step: number) => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	onSubmit: (data: RaffleFormData) => void;
}

const MultiStepFormContext = createContext<
	MultiStepFormContextType | undefined
>(undefined);

interface MultiStepFormProviderProps {
	children: React.ReactNode;
}

export function MultiStepFormProvider({
	children,
}: MultiStepFormProviderProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const totalSteps = STEPS.length;

	const form = useForm<RaffleFormData>({
		resolver: zodResolver(raffleFormSchema),
		mode: 'onChange',
		defaultValues: {
			title: '',
			description: '',
			price: 0,
			category: '',
			coverImage: [],
			startDate: '',
			endDate: '',
			pricePerTicket: 0,
			numberOfWinners: 0,
			minParticipants: 0,
			maxParticipants: 0,
		},
	});

	const nextStep = () => {
		if (currentStep < totalSteps - 1) {
			setCurrentStep(prev => prev + 1);
		}
	};

	const previousStep = () => {
		if (currentStep > 0) {
			setCurrentStep(prev => prev - 1);
		}
	};

	const goToStep = (step: number) => {
		if (step >= 0 && step < totalSteps) {
			setCurrentStep(step);
		}
	};

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;

	const handleCreateRaffle = (data: RaffleFormData) => {
		console.log('Form submitted:', data);
		// Handle form submission here
	};

	const handleSubmit = (data: RaffleFormData) => {
		if (isLastStep) {
			handleCreateRaffle(data);
		} else {
			nextStep();
		}
	};

	return (
		<MultiStepFormContext.Provider
			value={{
				currentStep,
				totalSteps,
				form,
				nextStep,
				previousStep,
				goToStep,
				isFirstStep,
				isLastStep,
				onSubmit: handleSubmit,
			}}
		>
			{children}
		</MultiStepFormContext.Provider>
	);
}

export function useMultiStepForm() {
	const context = useContext(MultiStepFormContext);
	if (!context) {
		throw new Error(
			'useMultiStepForm must be used within MultiStepFormProvider',
		);
	}
	return context;
}
