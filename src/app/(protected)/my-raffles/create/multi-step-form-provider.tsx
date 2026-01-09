'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React, { createContext, useContext, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createRaffle } from '@/services/raffle/create-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
import { useRouter } from 'next/navigation';
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
	isCreating: boolean;

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
	const [isCreating, setIsCreating] = useState(false);
	const router = useRouter();

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

	/**
	 * Handles raffle creation by calling the server action
	 * Shows toast notifications for success and error states
	 *
	 * @param data - The validated raffle form data
	 */
	const handleCreateRaffle = async (data: RaffleFormData) => {
		setIsCreating(true);

		try {
			const result = await createRaffle({
				title: data.title,
				description: data.description,
				price: data.price,
				category: data.category,
				startDate: data.startDate,
				endDate: data.endDate,
				pricePerTicket: data.pricePerTicket,
				numberOfWinners: data.numberOfWinners,
				minParticipants: data.minParticipants,
				maxParticipants: data.maxParticipants,
			});

			if (result.error || !result.raffle) {
				toast.error(result.error || 'Failed to create raffle');
				return;
			}

			const raffleId = result.raffle.id;

			if (data.coverImage && data.coverImage.length > 0) {
				const coverResult = await uploadCover(
					raffleId,
					data.coverImage[0],
				);
				if (coverResult.error) {
					console.error('Cover upload failed:', coverResult.error);
					toast.error('Raffle created but cover upload failed.');
				}
			}

			if (data.coverImage && data.coverImage.length > 1) {
				const galleryFiles = data.coverImage.slice(1);
				const galleryResult = await uploadGalleryImages(
					raffleId,
					galleryFiles,
				);
				if (galleryResult.error) {
					console.error(
						'Gallery upload failed:',
						galleryResult.error,
					);
					toast.error('Raffle created but gallery upload failed.');
				}
			}

			toast.success('Raffle created successfully!');
			router.push(`/my-raffles`);
		} catch (error) {
			console.error('Create raffle error:', error);
			toast.error('Something went wrong. Please try again');
		} finally {
			setIsCreating(false);
		}
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
				isCreating,
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
