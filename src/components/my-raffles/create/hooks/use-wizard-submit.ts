'use client';

import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { type z } from 'zod';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import type { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';
import { useCreateRaffleFlow } from '@/services/raffle/use-create-raffle-flow';

import { getRaffleFormDefaults } from '@/components/my-raffles/create/form-defaults';
import { STEPS } from '@/components/my-raffles/create/steps';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

interface CreatedRaffleInfo {
	publicSlug: string;
	raffleStartDate: string;
}

interface WizardSubmitOptions {
	form: UseFormReturn<RaffleFormData>;
	pendingPromoCodes: CreatePromoCodePayload[];
	currentStep: number;
	isLastStep: boolean;
	nextStep: () => void;
	setCurrentStep: (step: number) => void;
	clearDraft: () => void;
	clearPendingPromoCodes: () => void;
}

interface WizardSubmitResult {
	handleSubmit: (data: RaffleFormData) => void;
	isCreating: boolean;
	createdRaffle: CreatedRaffleInfo | null;
	setCreatedRaffle: (info: CreatedRaffleInfo | null) => void;
	isModalOpen: boolean;
	setIsModalOpen: (open: boolean) => void;
}

/**
 * Owns the post-creation state (success modal + created-raffle snapshot)
 * and the wizard submit handler. Extracted from the provider so the host
 * stays under the 150-LOC cap; the branching between "advance step" and
 * "run the create pipeline" plus the success-toast side effects are
 * thick enough to live on their own.
 *
 * @returns Submit handler, in-flight flag, and success-modal state.
 */
export function useWizardSubmit(
	options: WizardSubmitOptions,
): WizardSubmitResult {
	const {
		form,
		pendingPromoCodes,
		currentStep,
		isLastStep,
		nextStep,
		setCurrentStep,
		clearDraft,
		clearPendingPromoCodes,
	} = options;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [createdRaffle, setCreatedRaffle] = useState<CreatedRaffleInfo | null>(
		null,
	);

	const handleCreated = useCallback(
		(info: CreatedRaffleInfo) => {
			clearDraft();
			form.reset(getRaffleFormDefaults());
			setCurrentStep(0);
			clearPendingPromoCodes();
			setCreatedRaffle(info);
			setIsModalOpen(true);
		},
		[clearDraft, clearPendingPromoCodes, form, setCurrentStep],
	);

	const { handleCreateRaffle, isCreating } = useCreateRaffleFlow({
		form,
		pendingPromoCodes,
		onCreated: handleCreated,
		setCurrentStep,
	});

	const handleSubmit = useCallback(
		(data: RaffleFormData) => {
			if (isLastStep) {
				void handleCreateRaffle(data);
				return;
			}
			track(RAFFLE_EVENTS.CREATE_STEP_COMPLETED, {
				step_name: STEPS[currentStep].title,
				step_number: currentStep + 1,
			});
			nextStep();
		},
		[isLastStep, handleCreateRaffle, nextStep, currentStep],
	);

	return {
		handleSubmit,
		isCreating,
		createdRaffle,
		setCreatedRaffle,
		isModalOpen,
		setIsModalOpen,
	};
}
