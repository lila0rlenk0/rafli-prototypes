'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createContext, type ReactNode, useCallback, useContext } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import type { PublishMode } from '@/components/raffle/publish-split-button';
import {
	editFormSchema,
	type EditFormData,
	type FieldRestrictions,
} from '@/lib/validation/raffle/edit-form-schema';
import { usePublishRaffle } from '@/services/raffle/use-publish-raffle';
import type { Category } from '@/types/category';
import type { Question } from '@/types/question';
import type { Raffle } from '@/types/raffle';

import { STEPS } from './steps';
import { useEditRestrictions } from './use-restrictions';
import { useEditSaveActions } from './use-edit-save-actions';
import { useEditStepNavigation } from './use-step-navigation';

interface EditFormContextType {
	currentStep: number;
	totalSteps: number;
	form: UseFormReturn<EditFormData>;
	nextStep: () => void;
	previousStep: () => void;
	goToStep: (step: number) => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	onSubmit: (data: EditFormData) => void;
	isUpdating: boolean;
	isPublishing: boolean;
	handlePublish: (mode: PublishMode) => void;
	restrictions: FieldRestrictions;
	originalRaffle: Raffle;
	existingCoverUrl: string | null;
	existingGalleryUrls: string[];
	questions: Question[];
	categories: Category[];
	userName: string;
	totalRaffles: number;
}

const EditFormContext = createContext<EditFormContextType | undefined>(
	undefined,
);

interface EditFormProviderProps {
	children: ReactNode;
	raffle: Raffle;
	initialCoverUrl: string | null;
	initialGalleryUrls: string[];
	defaultValues: EditFormData;
	questions: Question[];
	categories: Category[];
	userName: string;
	totalRaffles: number;
}

/**
 * Provides a context for managing the multi-step raffle edit form.
 * Orchestrates wizard navigation (`useEditStepNavigation`), field-lock
 * derivation from raffle state (`useEditRestrictions`), the partial
 * update + auto-publish pipeline (`useEditSaveActions`), and the
 * "go live now / schedule" split (`usePublishRaffle`). Consumers read
 * state + mutators via `useEditForm`.
 */
export function EditFormProvider({
	children,
	raffle,
	initialCoverUrl,
	initialGalleryUrls,
	defaultValues,
	questions,
	categories,
	userName,
	totalRaffles,
}: EditFormProviderProps) {
	const {
		currentStep,
		setCurrentStep,
		nextStep,
		previousStep,
		goToStep,
		isFirstStep,
		isLastStep,
	} = useEditStepNavigation(STEPS.length);

	// usePublishRaffle encapsulates the "go live now" vs "schedule"
	// split; the edit provider just forwards its output to consumers.
	const { isPublishing, handlePublish } = usePublishRaffle({
		raffleId: raffle.id,
		startAt: raffle.startAt,
	});

	const form = useForm<EditFormData>({
		resolver: zodResolver(editFormSchema),
		mode: 'onChange',
		defaultValues,
	});

	const restrictions = useEditRestrictions(raffle);

	const { handleUpdateRaffle, isUpdating } = useEditSaveActions({
		form,
		raffle,
		defaultValues,
		setCurrentStep,
	});

	const handleSubmit = useCallback(
		(data: EditFormData) => {
			if (isLastStep) {
				void handleUpdateRaffle(data);
				return;
			}
			nextStep();
		},
		[isLastStep, handleUpdateRaffle, nextStep],
	);

	return (
		<EditFormContext.Provider
			value={{
				currentStep,
				totalSteps: STEPS.length,
				form,
				nextStep,
				previousStep,
				goToStep,
				isFirstStep,
				isLastStep,
				onSubmit: handleSubmit,
				isUpdating,
				isPublishing,
				handlePublish,
				restrictions,
				originalRaffle: raffle,
				existingCoverUrl: initialCoverUrl,
				existingGalleryUrls: initialGalleryUrls,
				questions,
				categories,
				userName,
				totalRaffles,
			}}
		>
			{children}
		</EditFormContext.Provider>
	);
}

/**
 * Hook to access the edit form context. Must be used within an
 * `EditFormProvider`.
 *
 * @returns The edit form context containing form state, navigation
 *   methods, field restrictions, and submit handlers.
 * @throws Error if used outside of `EditFormProvider`.
 */
export function useEditForm() {
	const context = useContext(EditFormContext);
	if (!context) {
		throw new Error('useEditForm must be used within EditFormProvider');
	}
	return context;
}
