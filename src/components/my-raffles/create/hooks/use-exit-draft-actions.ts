'use client';

import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import type { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

/**
 * Draft payload shape used by the save-draft flow. Mirrors the `draft`
 * slot persisted by `saveDraft` so TS catches structural drift.
 */
interface DraftPayload {
	title: string;
	description: string;
	price: number;
	category: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	pricePerTicket: number;
	numberOfWinners: number;
	minParticipants: number;
	maxParticipants: number;
	checkInQuestion: string;
	acceptsCrypto: boolean;
	cryptoChainIds: number[];
	cryptoTokens: string[];
	cryptoTokenPricing: { tokenId: string; price: string }[];
	currentStep: number;
}

interface ExitDraftHandlersOptions {
	form: UseFormReturn<RaffleFormData>;
	currentStep: number;
	saveDraft: (payload: DraftPayload, step: number) => void;
	clearDraft: () => void;
	setShowExitModal: (show: boolean) => void;
	isLeavingRef: React.RefObject<boolean>;
	pendingNavigationRef: React.RefObject<string | null>;
}

interface ExitDraftHandlers {
	handleStay: () => void;
	handleSaveDraft: () => void;
	handleLeaveWithoutSaving: () => void;
}

/**
 * NaN-safe projection from the RHF snapshot into the serializable draft
 * payload — localStorage can't round-trip NaN.
 */
function buildDraftPayload(
	values: RaffleFormData,
	currentStep: number,
): DraftPayload {
	return {
		title: values.title,
		description: values.description,
		price: Number.isNaN(values.price) ? 0 : values.price,
		category: values.category,
		startDate: values.startDate,
		startTime: values.startTime,
		endDate: values.endDate,
		endTime: values.endTime,
		pricePerTicket: Number.isNaN(values.pricePerTicket)
			? 0
			: values.pricePerTicket,
		numberOfWinners: Number.isNaN(values.numberOfWinners)
			? 0
			: values.numberOfWinners,
		minParticipants: values.minParticipants,
		maxParticipants: values.maxParticipants,
		checkInQuestion: values.checkInQuestion,
		acceptsCrypto: values.acceptsCrypto,
		cryptoChainIds: values.cryptoChainIds,
		cryptoTokens: values.cryptoTokens,
		cryptoTokenPricing: values.cryptoTokenPricing,
		currentStep,
	};
}

/**
 * Handlers wired to the `SaveDraftModal` — stay on page, save and
 * leave, or leave without saving. Each path clears the pending
 * navigation ref so the router doesn't replay an old destination on a
 * subsequent intercept.
 *
 * @returns The three modal handlers.
 */
export function useExitDraftActions({
	form,
	currentStep,
	saveDraft,
	clearDraft,
	setShowExitModal,
	isLeavingRef,
	pendingNavigationRef,
}: ExitDraftHandlersOptions): ExitDraftHandlers {
	const handleStay = useCallback(() => {
		pendingNavigationRef.current = null;
		setShowExitModal(false);
	}, [pendingNavigationRef, setShowExitModal]);

	const handleSaveDraft = useCallback(() => {
		saveDraft(buildDraftPayload(form.getValues(), currentStep), currentStep);
		toast.success('Draft saved successfully!');
		isLeavingRef.current = true;
		const target = pendingNavigationRef.current || '/my-raffles';
		pendingNavigationRef.current = null;
		window.location.href = target;
	}, [form, saveDraft, currentStep, isLeavingRef, pendingNavigationRef]);

	const handleLeaveWithoutSaving = useCallback(() => {
		clearDraft();
		isLeavingRef.current = true;
		const target = pendingNavigationRef.current || '/my-raffles';
		pendingNavigationRef.current = null;
		window.location.href = target;
	}, [clearDraft, isLeavingRef, pendingNavigationRef]);

	return { handleStay, handleSaveDraft, handleLeaveWithoutSaving };
}
