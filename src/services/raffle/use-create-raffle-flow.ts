'use client';

import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { type z } from 'zod';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';
import {
	getRaffleServerError,
	mapFieldIssuesToFormErrors,
} from '@/components/my-raffles/create/server-errors';
import { traceCreateRaffle } from '@/lib/sentry/breadcrumb';
import { bulkCreatePromoCodes } from '@/services/promo-code/bulk-create-promo-codes';
import { createRaffle } from '@/services/raffle/create-raffle';
import { publishRaffle } from '@/services/raffle/publish-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
import type { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

interface CreatedRaffleInfo {
	publicSlug: string;
	raffleStartDate: string;
}

interface CreateRaffleFlowOptions {
	form: UseFormReturn<RaffleFormData>;
	pendingPromoCodes: CreatePromoCodePayload[];
	onCreated: (info: CreatedRaffleInfo) => void;
	setCurrentStep: (step: number) => void;
}

interface CreateRaffleFlowResult {
	handleCreateRaffle: (data: RaffleFormData) => Promise<void>;
	isCreating: boolean;
}

/**
 * Builds the `createRaffle` payload with the user's timezone and the
 * `YYYY-MM-DDTHH:mm` datetime concatenation the backend expects.
 */
function buildCreateRafflePayload(data: RaffleFormData, userTimezone: string) {
	return {
		title: data.title,
		description: data.description,
		price: data.price,
		category: data.category,
		startDate: `${data.startDate}T${data.startTime || '00:00'}`,
		endDate: `${data.endDate}T${data.endTime || '00:00'}`,
		pricePerTicket: data.pricePerTicket,
		numberOfWinners: data.numberOfWinners,
		minParticipants: data.minParticipants,
		maxParticipants: data.maxParticipants,
		checkInQuestion: data.checkInQuestion,
		timezone: userTimezone,
		acceptsCrypto: data.acceptsCrypto,
		cryptoChainIds: data.cryptoChainIds,
		cryptoTokens: data.cryptoTokens,
		cryptoTokenPricing: data.cryptoTokenPricing,
		// Advanced raffle config — schema mirrors backend defaults, so
		// untouched controls forward the backend-equivalent value rather
		// than relying on the server-side default. Keeps the wire payload
		// explicit and the audit trail accurate.
		minTickets: data.minTickets,
		maxTicketsPerUser: data.maxTicketsPerUser,
		winnerSelectionMode: data.winnerSelectionMode,
		enrollmentMode: data.enrollmentMode,
		xShareTicketsEnabled: data.xShareTicketsEnabled,
	};
}

/**
 * Uploads any images attached to the form. Cover is the first file;
 * subsequent slots populate the gallery. Toasts on failure but never
 * throws so the subsequent promo-code + publish steps still run.
 *
 * @returns Whether a cover image was successfully uploaded.
 */
async function uploadRaffleMedia(
	raffleId: string,
	coverImage: readonly File[] | undefined,
): Promise<boolean> {
	if (!coverImage || coverImage.length === 0) return false;

	let coverUploaded = false;
	const coverResult = await uploadCover(raffleId, coverImage[0]);
	if (!coverResult.success) {
		traceCreateRaffle(
			'pipeline: cover upload failed',
			{ raffleId, errorCode: coverResult.error },
			'warning',
		);
		console.error('Cover upload failed:', coverResult.error);
		toast.error('Sweepstakes created but cover upload failed.');
	} else {
		coverUploaded = true;
	}

	if (coverImage.length > 1) {
		const galleryResult = await uploadGalleryImages(
			raffleId,
			coverImage.slice(1),
		);
		if (!galleryResult.success) {
			traceCreateRaffle(
				'pipeline: gallery upload failed',
				{ raffleId, errorCode: galleryResult.error },
				'warning',
			);
			console.error('Gallery upload failed:', galleryResult.error);
			toast.error('Sweepstakes created but gallery upload failed.');
		}
	}
	return coverUploaded;
}

/**
 * Persists any queued promo-code batches sequentially so we don't burst
 * the rate limiter. Failures are accumulated and surfaced in a single
 * toast so a partial success isn't misrepresented as a complete failure.
 */
async function persistPendingPromoCodes(
	raffleId: string,
	pendingPromoCodes: CreatePromoCodePayload[],
): Promise<void> {
	if (pendingPromoCodes.length === 0) return;
	let failedCount = 0;
	for (const promoCode of pendingPromoCodes) {
		const promoResult = await bulkCreatePromoCodes(raffleId, promoCode);
		if (!promoResult.success) {
			console.error('Promo code creation failed:', promoResult.error);
			failedCount++;
		}
	}
	if (failedCount > 0) {
		traceCreateRaffle(
			'pipeline: promo code batches failed',
			{ raffleId, failedCount, total: pendingPromoCodes.length },
			'warning',
		);
		toast.error(
			`${failedCount} promo code batch${failedCount > 1 ? 'es' : ''} failed to create`,
		);
	}
}

/**
 * Auto-publishes when the start datetime is in the past and a cover was
 * uploaded (the backend rejects publish without a cover). On failure the
 * user sees a warning toast and can publish manually from the
 * dashboard.
 */
async function maybeAutoPublish(
	raffleId: string,
	startDate: string,
	options: { coverUploaded: boolean },
): Promise<void> {
	const { coverUploaded } = options;
	if (!coverUploaded) return;
	if (new Date(startDate) > new Date()) return;
	const publishResult = await publishRaffle(raffleId);
	if (!publishResult.success) {
		traceCreateRaffle(
			'pipeline: auto-publish failed',
			{ raffleId, errorCode: publishResult.error },
			'warning',
		);
		console.error('Auto-publish failed:', publishResult.error);
		toast.warning(
			'Sweepstakes created as draft. Please go live manually from your dashboard.',
		);
	}
}

async function runCreateRafflePipeline(
	data: RaffleFormData,
	ctx: {
		form: UseFormReturn<RaffleFormData>;
		pendingPromoCodes: CreatePromoCodePayload[];
		onCreated: (info: CreatedRaffleInfo) => void;
		setCurrentStep: (step: number) => void;
	},
): Promise<void> {
	if (!data.checkInQuestion) {
		traceCreateRaffle(
			'pipeline: aborted, no check-in question selected',
			undefined,
			'warning',
		);
		toast.error('Please select a check-in question');
		return;
	}

	traceCreateRaffle('pipeline: creating raffle record', {
		hasCover: Boolean(data.coverImage?.length),
		pendingPromoBatches: ctx.pendingPromoCodes.length,
		acceptsCrypto: data.acceptsCrypto,
	});

	const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const result = await createRaffle(
		buildCreateRafflePayload(data, userTimezone),
	);

	if (!result.success) {
		traceCreateRaffle(
			'pipeline: createRaffle returned failure',
			{ errorCode: result.error, fieldIssues: result.fieldIssues?.length ?? 0 },
			'error',
		);
		// Prefer per-field surfacing when the backend shipped Zod issues —
		// every offending input gets `setError` so the user fixes them
		// inline instead of guessing from a single toast.
		if (result.fieldIssues && result.fieldIssues.length > 0) {
			const formErrors = mapFieldIssuesToFormErrors(result.fieldIssues);
			for (const [field, message] of formErrors) {
				ctx.form.setError(field, { message });
			}
			ctx.setCurrentStep(1);
			toast.error('Please fix the highlighted fields and try again.');
			return;
		}
		const { message, field } = getRaffleServerError(result.error);
		toast.error(message);
		if (field) {
			ctx.form.setError(field, { message });
			ctx.setCurrentStep(1);
		}
		return;
	}

	const raffleId = result.data.id;
	traceCreateRaffle('pipeline: raffle record created', { raffleId });
	const coverUploaded = await uploadRaffleMedia(raffleId, data.coverImage);
	await persistPendingPromoCodes(raffleId, ctx.pendingPromoCodes);
	await maybeAutoPublish(raffleId, data.startDate, { coverUploaded });

	traceCreateRaffle('pipeline: completed', { raffleId, coverUploaded });
	ctx.onCreated({
		publicSlug: result.data.publicSlugOrCode,
		raffleStartDate: data.startDate,
	});
}

/**
 * Orchestrates the full raffle-creation pipeline: create record → upload
 * cover → upload gallery → persist pending promo codes → maybe publish
 * → surface the success modal. Each phase is isolated so each can fail
 * independently without aborting the rest.
 *
 * @returns The submit handler + the in-flight flag for the UI.
 */
export function useCreateRaffleFlow({
	form,
	pendingPromoCodes,
	onCreated,
	setCurrentStep,
}: CreateRaffleFlowOptions): CreateRaffleFlowResult {
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateRaffle = useCallback(
		async (data: RaffleFormData) => {
			setIsCreating(true);
			try {
				await runCreateRafflePipeline(data, {
					form,
					pendingPromoCodes,
					onCreated,
					setCurrentStep,
				});
			} catch (error) {
				traceCreateRaffle('pipeline: unexpected error', undefined, 'error');
				console.error('Create raffle error:', error);
				toast.error('Something went wrong. Please try again');
			} finally {
				setIsCreating(false);
			}
		},
		[form, pendingPromoCodes, onCreated, setCurrentStep],
	);

	return { handleCreateRaffle, isCreating };
}
