'use client';

import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import type { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';

import { getRaffleFormDefaults } from '@/components/my-raffles/create/form-defaults';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

interface DraftShape {
	title: string;
	description: string;
	price?: number;
	category: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	pricePerTicket?: number;
	numberOfWinners?: number;
	minParticipants: number;
	maxParticipants: number;
	checkInQuestion?: string;
	acceptsCrypto?: boolean;
	cryptoChainIds?: number[];
	cryptoTokens?: string[];
	cryptoTokenPricing?: { tokenId: string; price: string }[];
	currentStep: number;
}

interface DraftHandlersOptions {
	form: UseFormReturn<RaffleFormData>;
	draft: DraftShape | null;
	clearDraft: () => void;
	setCurrentStep: (step: number) => void;
}

interface DraftHandlers {
	handleContinueDraft: () => void;
	handleStartFresh: () => void;
}

/**
 * Draft restore + start-fresh handlers pulled out of the provider so
 * the main component stays under the function-length cap. Both call
 * `form.reset(...)` through the shared `getRaffleFormDefaults()`
 * factory so the "empty form" shape stays in one place.
 *
 * @returns The restore + clear handlers passed to `RestoreDraftModal`.
 */
export function useRaffleDraftActions({
	form,
	draft,
	clearDraft,
	setCurrentStep,
}: DraftHandlersOptions): DraftHandlers {
	const handleContinueDraft = useCallback(() => {
		if (!draft) return;
		form.reset({
			...getRaffleFormDefaults(),
			title: draft.title,
			description: draft.description,
			price: draft.price || Number.NaN,
			category: draft.category,
			startDate: draft.startDate,
			startTime: draft.startTime,
			endDate: draft.endDate,
			endTime: draft.endTime,
			pricePerTicket: draft.pricePerTicket || Number.NaN,
			numberOfWinners: draft.numberOfWinners || Number.NaN,
			minParticipants: draft.minParticipants,
			maxParticipants: draft.maxParticipants,
			checkInQuestion: draft.checkInQuestion || '',
			acceptsCrypto: draft.acceptsCrypto ?? false,
			cryptoChainIds: draft.cryptoChainIds ?? [],
			cryptoTokens: draft.cryptoTokens ?? [],
			cryptoTokenPricing: draft.cryptoTokenPricing ?? [],
		});
		setCurrentStep(draft.currentStep);
		toast.info('Draft restored. Please re-upload your images if needed.');
	}, [draft, form, setCurrentStep]);

	const handleStartFresh = useCallback(() => {
		clearDraft();
		form.reset(getRaffleFormDefaults());
		setCurrentStep(0);
	}, [clearDraft, form, setCurrentStep]);

	return { handleContinueDraft, handleStartFresh };
}
