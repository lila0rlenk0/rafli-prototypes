'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { type z } from 'zod';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { useRaffleDraft } from '@/lib/hooks/use-raffle-draft';
import { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';
import type { Category } from '@/types/category';
import type { Question } from '@/types/question';

import { ProviderModals } from '@/components/my-raffles/create/modals/provider-modals';
import { getRaffleFormDefaults } from '@/components/my-raffles/create/form-defaults';
import { STEPS } from '@/components/my-raffles/create/steps';
import { useExitDraftActions } from '@/components/my-raffles/create/hooks/use-exit-draft-actions';
import { usePendingPromoCodes } from '@/components/my-raffles/create/hooks/use-pending-promo-codes';
import { useRaffleDraftActions } from '@/components/my-raffles/create/hooks/use-raffle-draft-actions';
import { useStepNavigation } from '@/components/my-raffles/create/hooks/use-step-navigation';
import { useUnsavedChangesGuard } from '@/components/my-raffles/create/hooks/use-unsaved-changes-guard';
import { useWizardSubmit } from '@/components/my-raffles/create/hooks/use-wizard-submit';

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
	isRaffleCreated: boolean;
	userName: string;
	totalRaffles: number;
	hasUnsavedChanges: boolean;
	setShowExitModal: (show: boolean) => void;
	questions: Question[];
	categories: Category[];
	pendingPromoCodes: CreatePromoCodePayload[];
	addPendingPromoCode: (data: CreatePromoCodePayload) => void;
	removePendingPromoCode: (index: number) => void;
	clearPendingPromoCodes: () => void;
}

const MultiStepFormContext = createContext<
	MultiStepFormContextType | undefined
>(undefined);

interface MultiStepFormProviderProps {
	children: ReactNode;
	userName: string;
	totalRaffles: number;
	questions: Question[];
	categories: Category[];
}

/**
 * One-shot toast that tells the user why the form came up empty when
 * `loadRaffleDraft` had to quarantine a corrupt blob (schema drift
 * across deploys, half-flushed write). Suppressed when a valid draft
 * exists — the restore modal already surfaces recovery UX and stacking
 * both would be noise.
 *
 * Extracted from the provider body so the host function stays under the
 * 150-LOC cap enforced by ESLint `max-lines-per-function`.
 */
interface AbandonedDraftNoticeProps {
	hasAbandoned: boolean;
	hasDraft: boolean;
	dismiss: () => void;
}

function useAbandonedDraftNotice(props: AbandonedDraftNoticeProps): void {
	const { hasAbandoned, hasDraft, dismiss } = props;
	useEffect(() => {
		if (!hasAbandoned || hasDraft) return;
		toast.info(
			"We couldn't restore your last draft. A backup is kept on this device — contact support if you need to recover it.",
		);
		dismiss();
	}, [hasAbandoned, hasDraft, dismiss]);
}

/**
 * Mount-only analytics ping: fires `CREATE_STARTED` once per provider
 * instance so we can diff wizard entries against completion rate.
 * Extracted from the provider body to fit under the 150-LOC cap.
 */
function useTrackWizardEntry(): void {
	useEffect(() => {
		track(RAFFLE_EVENTS.CREATE_STARTED, {});
	}, []);
}

/**
 * Tests whether the form currently carries any data worth persisting as
 * a draft. Intentionally excludes `coverImage` (File[] can't be
 * serialized to localStorage) and inspects only the primitive fields.
 */
function hasFormChanges(values: RaffleFormData): boolean {
	return (
		values.title !== '' ||
		values.description !== '' ||
		!Number.isNaN(values.price) ||
		values.category !== '' ||
		values.startDate !== '' ||
		values.endDate !== '' ||
		!Number.isNaN(values.pricePerTicket) ||
		!Number.isNaN(values.numberOfWinners) ||
		values.minParticipants !== 0 ||
		values.maxParticipants !== 0 ||
		values.checkInQuestion !== '' ||
		values.acceptsCrypto !== false ||
		values.cryptoChainIds.length > 0 ||
		values.cryptoTokens.length > 0 ||
		values.cryptoTokenPricing.length > 0
	);
}

/**
 * Provides a context for managing multi-step raffle-creation form
 * state. Orchestrates wizard navigation, the submit pipeline + success
 * modal (delegated to `useWizardSubmit`), unsaved-changes guarding
 * (delegated to `useUnsavedChangesGuard`), and the save/restore-draft
 * modals. Consumers read state + mutators via `useMultiStepForm`.
 */
export function MultiStepFormProvider({
	children,
	userName,
	totalRaffles,
	questions,
	categories,
}: MultiStepFormProviderProps) {
	const {
		currentStep,
		setCurrentStep,
		nextStep,
		previousStep,
		goToStep,
		isFirstStep,
		isLastStep,
	} = useStepNavigation(STEPS.length);
	const [showExitModal, setShowExitModal] = useState(false);
	const [draftLoaded, setDraftLoaded] = useState(false);
	const [showRestoreModal, setShowRestoreModal] = useState(false);
	const {
		pendingPromoCodes,
		addPendingPromoCode,
		removePendingPromoCode,
		clearPendingPromoCodes,
	} = usePendingPromoCodes();

	const {
		draft,
		hasDraft,
		saveDraft,
		clearDraft,
		isLoading: isDraftLoading,
		hasAbandonedDraft: hasAbandoned,
		dismissAbandonedDraft,
	} = useRaffleDraft();

	const form = useForm<RaffleFormData>({
		resolver: zodResolver(raffleFormSchema),
		mode: 'onChange',
		defaultValues: getRaffleFormDefaults(),
	});

	// useWatch subscribes to every field — equivalent to `form.watch()`
	// but compatible with React Compiler memoization (the raw `watch()`
	// trips `react-hooks/incompatible-library`).
	const formValues = useWatch({ control: form.control });
	const hasUnsavedChanges = hasFormChanges(formValues as RaffleFormData);

	useTrackWizardEntry();
	useAbandonedDraftNotice({
		hasAbandoned,
		hasDraft,
		dismiss: dismissAbandonedDraft,
	});

	// Render-time sync — open the restore modal in the same render that
	// draft data first becomes available, rather than an extra effect hop.
	if (!isDraftLoading && !draftLoaded && hasDraft && draft) {
		setShowRestoreModal(true);
		setDraftLoaded(true);
	}

	const { handleContinueDraft, handleStartFresh } = useRaffleDraftActions({
		form,
		draft: draft ?? null,
		clearDraft,
		setCurrentStep,
	});

	const { isLeavingRef, pendingNavigationRef } = useUnsavedChangesGuard({
		hasUnsavedChanges,
		onInterceptNavigation: useCallback(() => setShowExitModal(true), []),
	});

	const { handleStay, handleSaveDraft, handleLeaveWithoutSaving } =
		useExitDraftActions({
			form,
			currentStep,
			saveDraft,
			clearDraft,
			setShowExitModal,
			isLeavingRef,
			pendingNavigationRef,
		});

	const {
		handleSubmit,
		isCreating,
		createdRaffle,
		setCreatedRaffle,
		isModalOpen,
		setIsModalOpen,
	} = useWizardSubmit({
		form,
		pendingPromoCodes,
		currentStep,
		isLastStep,
		nextStep,
		setCurrentStep,
		clearDraft,
		clearPendingPromoCodes,
	});

	return (
		<MultiStepFormContext.Provider
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
				isCreating,
				isRaffleCreated: createdRaffle !== null,
				userName,
				totalRaffles,
				hasUnsavedChanges,
				setShowExitModal,
				questions,
				categories,
				pendingPromoCodes,
				addPendingPromoCode,
				removePendingPromoCode,
				clearPendingPromoCodes,
			}}
		>
			{children}
			<ProviderModals
				createdRaffle={createdRaffle}
				isModalOpen={isModalOpen}
				onModalOpenChange={open => {
					setIsModalOpen(open);
					if (!open) setCreatedRaffle(null);
				}}
				showExitModal={showExitModal}
				onExitModalOpenChange={setShowExitModal}
				onStay={handleStay}
				onSaveDraft={handleSaveDraft}
				onLeaveWithoutSaving={handleLeaveWithoutSaving}
				showRestoreModal={showRestoreModal}
				onRestoreModalOpenChange={setShowRestoreModal}
				onContinueDraft={handleContinueDraft}
				onStartFresh={handleStartFresh}
			/>
		</MultiStepFormContext.Provider>
	);
}

/**
 * Hook to access the multi-step form context. Must be used within a
 * `MultiStepFormProvider`.
 *
 * @returns The multi-step form context.
 * @throws Error if used outside of `MultiStepFormProvider`.
 */
export function useMultiStepForm() {
	const context = useContext(MultiStepFormContext);
	if (!context) {
		throw new Error(
			'useMultiStepForm must be used within MultiStepFormProvider',
		);
	}
	return context;
}
