'use client';

import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import type { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';
import type { EnrollmentMode, WinnerSelectionMode } from '@/types/raffle';

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
	minTickets?: number;
	maxTicketsPerUser?: number;
	winnerSelectionMode?: WinnerSelectionMode;
	enrollmentMode?: EnrollmentMode;
	xShareTicketsEnabled?: boolean;
	currentStep: number;
}

/**
 * Pulls just the crypto block out of the draft. Each `??` fallback counts
 * against the host function's cyclomatic complexity, so we shard the
 * draft → form merge into one helper per logical block to keep
 * `buildRestoredFormData` under the lint cap.
 */
function restoreCryptoBlock(
	draft: DraftShape,
): Pick<
	RaffleFormData,
	'acceptsCrypto' | 'cryptoChainIds' | 'cryptoTokens' | 'cryptoTokenPricing'
> {
	return {
		acceptsCrypto: draft.acceptsCrypto ?? false,
		cryptoChainIds: draft.cryptoChainIds ?? [],
		cryptoTokens: draft.cryptoTokens ?? [],
		cryptoTokenPricing: draft.cryptoTokenPricing ?? [],
	};
}

/**
 * Pulls the advanced-settings block. Pre-v2 drafts predate these fields,
 * so each falls back to the same default a fresh form would seed —
 * otherwise restoring an old draft would clobber the schema with
 * `undefined` and break submission.
 */
function restoreAdvancedBlock(
	draft: DraftShape,
): Pick<
	RaffleFormData,
	| 'minTickets'
	| 'maxTicketsPerUser'
	| 'winnerSelectionMode'
	| 'enrollmentMode'
	| 'xShareTicketsEnabled'
> {
	return {
		minTickets: draft.minTickets ?? 0,
		maxTicketsPerUser: draft.maxTicketsPerUser ?? 0,
		winnerSelectionMode: draft.winnerSelectionMode ?? 'unique_user',
		enrollmentMode: draft.enrollmentMode ?? 'standard',
		xShareTicketsEnabled: draft.xShareTicketsEnabled ?? false,
	};
}

/**
 * Merges a persisted draft over the fresh-form defaults. The scalar
 * field assignments live here; crypto and advanced blocks delegate to
 * sibling helpers so this function stays under the lint complexity cap.
 */
function buildRestoredFormData(draft: DraftShape): RaffleFormData {
	return {
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
		...restoreCryptoBlock(draft),
		...restoreAdvancedBlock(draft),
	};
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
		form.reset(buildRestoredFormData(draft));
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
