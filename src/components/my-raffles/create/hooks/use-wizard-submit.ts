'use client';

import * as Sentry from '@sentry/nextjs';
import { useCallback, useState } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { type z } from 'zod';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { traceCreateRaffle } from '@/lib/sentry/breadcrumb';
import type { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';
import { useCreateRaffleFlow } from '@/services/raffle/use-create-raffle-flow';

import { getRaffleFormDefaults } from '@/components/my-raffles/create/form-defaults';
import { STEPS } from '@/components/my-raffles/create/steps';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

/** Wizard step index that owns the basic-info fields. */
const BASIC_INFO_STEP = 0;
/** Wizard step index that owns the tickets/schedule fields. */
const TICKETS_STEP = 1;

/**
 * Form fields rendered on the Basic Info step. A blocked submit routes back
 * to the earliest step holding an invalid field; anything not listed here
 * lives on the Tickets step. Mirrors the schema's "Step 1" block —
 * `coverImage` is included because it renders on this step even though it's
 * optional.
 */
const BASIC_INFO_FIELDS = new Set<string>([
	'title',
	'description',
	'price',
	'category',
	'coverImage',
]);

/**
 * Pulls the first human-readable validation message out of the react-hook-form
 * error map so the toast can name the offending field instead of a generic
 * "fix the form".
 */
function firstErrorMessage(
	errors: FieldErrors<RaffleFormData>,
): string | undefined {
	for (const value of Object.values(errors)) {
		if (value && typeof value === 'object' && 'message' in value) {
			const { message } = value;
			if (typeof message === 'string') return message;
		}
	}
	return undefined;
}

/**
 * Handles a submit that react-hook-form rejected on validation. Without this
 * the wizard's final "Create" button looks dead — RHF aborts the submit
 * silently when an off-screen earlier-step field is invalid. Surfaces the
 * block to Sentry (trail + captured message) and the console, then routes the
 * user to the earliest step that owns an invalid field.
 *
 * Module-scope (not a closure) so the hook body stays under the
 * `max-lines-per-function` cap; the step setter is passed in explicitly.
 */
function reportBlockedSubmit(
	errors: FieldErrors<RaffleFormData>,
	currentStep: number,
	setCurrentStep: (step: number) => void,
): void {
	const fields = Object.keys(errors);

	traceCreateRaffle(
		'submit blocked: client validation failed',
		{ fields, currentStep },
		'warning',
	);
	Sentry.captureMessage('Raffle create blocked by client validation', {
		level: 'warning',
		fingerprint: ['raffle-create', 'validation-block'],
		extra: { fields },
	});
	console.warn('[create-raffle] submit blocked by validation', errors);

	const targetStep = fields.some(field => BASIC_INFO_FIELDS.has(field))
		? BASIC_INFO_STEP
		: TICKETS_STEP;
	setCurrentStep(targetStep);
	toast.error(
		firstErrorMessage(errors) ??
			'Please fix the highlighted fields before creating.',
	);
}

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
	handleInvalid: (errors: FieldErrors<RaffleFormData>) => void;
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

	// Plain declarations (not useCallback): both are only spread into the
	// context value — itself rebuilt every render — and consumed via an inline
	// `form.handleSubmit(...)`, so memoizing them buys no referential stability.
	function handleSubmit(data: RaffleFormData): void {
		if (isLastStep) {
			traceCreateRaffle('submit: review accepted, starting pipeline');
			void handleCreateRaffle(data);
			return;
		}
		track(RAFFLE_EVENTS.CREATE_STEP_COMPLETED, {
			step_name: STEPS[currentStep].title,
			step_number: currentStep + 1,
		});
		nextStep();
	}

	function handleInvalid(errors: FieldErrors<RaffleFormData>): void {
		reportBlockedSubmit(errors, currentStep, setCurrentStep);
	}

	return {
		handleSubmit,
		handleInvalid,
		isCreating,
		createdRaffle,
		setCreatedRaffle,
		isModalOpen,
		setIsModalOpen,
	};
}
