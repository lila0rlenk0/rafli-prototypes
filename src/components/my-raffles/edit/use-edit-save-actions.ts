'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';

import type { EditFormData } from '@/lib/validation/raffle/edit-form-schema';
import {
	computeRaffleDiff,
	hasRaffleChanges,
} from '@/lib/utils/raffle/raffle-diff';
import { publishRaffle } from '@/services/raffle/publish-raffle';
import { updateRaffle } from '@/services/raffle/update-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';

import { getEditRaffleServerError } from './server-errors';

interface EditSaveHandlersOptions {
	form: UseFormReturn<EditFormData>;
	raffle: Raffle;
	defaultValues: EditFormData;
	setCurrentStep: (step: number) => void;
}

interface EditSaveHandlersResult {
	handleUpdateRaffle: (data: EditFormData) => Promise<void>;
	isUpdating: boolean;
}

// Tickets step index — where minParticipants, endDate live. Kept in
// sync with STEPS in `./steps/index.ts`. Field-targeted server errors
// jump here so the user lands on the offending input.
const TICKETS_STEP_INDEX = 1;

/**
 * Upload any newly-attached cover/gallery files. First slot is the
 * cover, subsequent slots populate the gallery. Toasts on failure but
 * never throws so the rest of the pipeline (auto-publish, redirect)
 * still runs.
 */
async function uploadEditRaffleMedia(
	raffleId: string,
	coverImage: readonly File[] | undefined,
): Promise<void> {
	if (!coverImage || coverImage.length === 0) return;

	const coverResult = await uploadCover(raffleId, coverImage[0]);
	if (!coverResult.success) {
		console.error('Cover upload failed:', coverResult.error);
		toast.error('Sweepstakes updated but cover upload failed.');
	}

	if (coverImage.length > 1) {
		const galleryResult = await uploadGalleryImages(
			raffleId,
			coverImage.slice(1),
		);
		if (!galleryResult.success) {
			console.error('Gallery upload failed:', galleryResult.error);
			toast.error('Sweepstakes updated but gallery upload failed.');
		}
	}
}

/**
 * Auto-publishes the raffle when its status is still draft AND the
 * saved start datetime is now/past. Queued raffles are already
 * published — calling publishRaffle there would fail with NOT_DRAFT.
 */
async function maybeAutoPublishDraft(
	raffle: Raffle,
	data: EditFormData,
): Promise<void> {
	if (raffle.status !== RAFFLE_STATUS.DRAFT) return;
	// Combine date + time for accurate past/future comparison.
	const startDateTime = new Date(
		`${data.startDate}T${data.startTime || '00:00'}`,
	);
	if (startDateTime > new Date()) return;

	const publishResult = await publishRaffle(raffle.id);
	if (!publishResult.success) {
		console.error('Auto-publish failed:', publishResult.error);
		toast.warning(
			'Sweepstakes updated but could not go live. Please go live manually from your dashboard.',
		);
	}
}

interface PushDiffArgs {
	raffle: Raffle;
	data: EditFormData;
	form: UseFormReturn<EditFormData>;
	setCurrentStep: (step: number) => void;
}

/**
 * Sends the partial update (only changed fields). Returns false when
 * the caller should halt the pipeline — either because the server
 * rejected the diff (user already notified via toast + form error) or
 * because the diff collapsed to zero fields (no-op).
 *
 * @returns Whether the pipeline should continue to media + publish.
 */
async function pushRaffleDiff({
	raffle,
	data,
	form,
	setCurrentStep,
}: PushDiffArgs): Promise<boolean> {
	const diff = computeRaffleDiff({
		original: raffle,
		current: data,
		categoryId: data.category,
		checkInQuestionId: data.checkInQuestion,
	});
	if (Object.keys(diff).length === 0) return true;

	const result = await updateRaffle(raffle.id, diff);
	if (result.success) return true;

	const { message, field } = getEditRaffleServerError(result.error);
	toast.error(message);
	if (field) {
		form.setError(field, { message });
		setCurrentStep(TICKETS_STEP_INDEX);
	}
	return false;
}

/**
 * Gates the pipeline on required UUID selects that Zod can't validate
 * (category / question IDs). Toasts the reason and returns false so the
 * caller aborts before any network call.
 */
function validateRequiredSelects(data: EditFormData): boolean {
	if (!data.category) {
		toast.error('Invalid category selected');
		return false;
	}
	if (!data.checkInQuestion) {
		toast.error('Please select a check-in question');
		return false;
	}
	return true;
}

/**
 * Short-circuit guard: the submit button should already be disabled
 * when there is nothing to save, but double-check in case an event
 * fired on a stale render.
 */
function hasAnyChanges(raffle: Raffle, data: EditFormData): boolean {
	const hasNewImages = !!data.coverImage && data.coverImage.length > 0;
	const hasFieldChanges = hasRaffleChanges({
		original: raffle,
		current: data,
		categoryId: data.category,
		checkInQuestionId: data.checkInQuestion,
	});
	return hasNewImages || hasFieldChanges;
}

/**
 * Orchestrates the multi-phase raffle update pipeline:
 * 1. Short-circuit if nothing changed.
 * 2. Validate required UUID selects.
 * 3. Send the partial diff — abort on server error.
 * 4. Upload any new media (best-effort, toasts on failure).
 * 5. Auto-publish if the draft start datetime is already past.
 * 6. Reset form + navigate to /my-raffles.
 *
 * @returns The submit handler and the in-flight flag.
 */
export function useEditSaveActions({
	form,
	raffle,
	defaultValues,
	setCurrentStep,
}: EditSaveHandlersOptions): EditSaveHandlersResult {
	const router = useRouter();
	const [isUpdating, setIsUpdating] = useState(false);

	const handleUpdateRaffle = useCallback(
		async (data: EditFormData) => {
			setIsUpdating(true);
			try {
				if (!hasAnyChanges(raffle, data)) return;
				if (!validateRequiredSelects(data)) return;

				const diffOk = await pushRaffleDiff({
					raffle,
					data,
					form,
					setCurrentStep,
				});
				if (!diffOk) return;

				await uploadEditRaffleMedia(raffle.id, data.coverImage);
				await maybeAutoPublishDraft(raffle, data);

				toast.success('Sweepstakes updated successfully!');
				form.reset(defaultValues);
				setCurrentStep(0);
				router.push('/my-raffles');
			} catch (error) {
				console.error('Update raffle error:', error);
				toast.error('Something went wrong. Please try again');
			} finally {
				setIsUpdating(false);
			}
		},
		[raffle, form, defaultValues, setCurrentStep, router],
	);

	return { handleUpdateRaffle, isUpdating };
}
