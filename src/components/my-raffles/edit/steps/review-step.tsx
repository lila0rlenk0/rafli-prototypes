'use client';

import { Clock, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/ui-custom/markdown-renderer';
import { ReviewRow } from '@/components/ui/data-review/review-row';
import { ReviewSection } from '@/components/ui/data-review/review-section';
import {
	getActivePeriodDisplay,
	getCategoryDisplay,
	getDeclaredValueDisplay,
	getDescriptionDisplay,
	getParticipantsRangeDisplay,
	getPaymentSummaryDisplay,
	getPricePerTicketDisplay,
	getWinnersDisplay,
	willStartImmediately,
} from '@/components/my-raffles/shared/review/field-getters';
import { hasRaffleChanges } from '@/lib/utils/raffle/raffle-diff';

import { useEditForm } from '../form-provider';

// Wizard step indexes — kept in sync with `./index.ts`.
const BASIC_INFO_STEP = 0;
const TICKETS_STEP = 1;

/**
 * Review step of the raffle edit wizard. Displays a preview of all raffle
 * data and gates the submit button behind an actual-changes check so a
 * host cannot accidentally re-submit an unchanged form.
 *
 * Images show new uploads (via `URL.createObjectURL` on the fly) when
 * present, falling back to the existing backend-hosted URLs. The `Image`
 * component is set `unoptimized` only when a blob URL is in use — Next's
 * image pipeline cannot transform `blob:` sources.
 *
 * @returns Review card with image grid, host identity, data sections, and
 *   the save button.
 */
export function ReviewStep() {
	const {
		form,
		isUpdating,
		existingCoverUrl,
		existingGalleryUrls,
		originalRaffle,
		categories,
		userName,
		totalRaffles,
		goToStep,
	} = useEditForm();

	// form.watch() gives a fresh reference per field change so the review
	// always mirrors current inputs; no useMemo needed (would stale-cache).
	const values = form.watch();
	const coverImage = values.coverImage;
	const hasChanges =
		(coverImage && coverImage.length > 0) ||
		hasRaffleChanges({
			original: originalRaffle,
			current: values,
			categoryId: values.category,
			checkInQuestionId: values.checkInQuestion,
		});
	const hostLabel = userName || 'Sweepstakes Host';
	const hostInitial = userName ? userName.charAt(0) : '';
	const showStartNowBanner = willStartImmediately(values);

	// Blob URLs are rebuilt every render — cheap and keeps the preview
	// bound to the latest File reference. Cleanup happens via GC when the
	// revision ticks over; Next flags these `unoptimized`.
	const coverSrc = coverImage?.[0]
		? URL.createObjectURL(coverImage[0])
		: existingCoverUrl;

	function resolveGallerySrc(index: number): string | null {
		// coverImage[0] is the cover; gallery slots live at [1], [2], [3].
		const file = coverImage?.[index + 1];
		if (file) return URL.createObjectURL(file);
		return existingGalleryUrls[index] ?? null;
	}

	function handleEditBasics() {
		goToStep(BASIC_INFO_STEP);
	}

	function handleEditTickets() {
		goToStep(TICKETS_STEP);
	}

	return (
		<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
			<div className="flex flex-col gap-4">
				<div className="border-ink-200 relative flex aspect-video max-h-64 w-full items-center justify-center overflow-hidden rounded-lg border bg-white">
					{coverSrc ? (
						<Image
							src={coverSrc}
							alt="Cover"
							fill
							sizes="(max-width: 780px) 100vw, 780px"
							className="object-cover"
							unoptimized={coverImage?.[0] !== undefined}
						/>
					) : (
						<ImageIcon className="size-12 text-gray-400" />
					)}
				</div>
				<div className="grid grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, index) => (
						<GallerySlot
							key={index}
							src={resolveGallerySrc(index)}
							index={index}
							isBlob={coverImage?.[index + 1] !== undefined}
						/>
					))}
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold">
					{hostInitial}
				</div>
				<div className="flex min-w-0 flex-col font-medium">
					<span className="truncate text-sm">by {hostLabel}</span>
					<span className="text-xs">{totalRaffles} Sweepstakes</span>
				</div>
			</div>

			<ReviewSection title="Basics" onEdit={handleEditBasics}>
				<ReviewRow label="Description">
					<MarkdownRenderer
						content={getDescriptionDisplay(values)}
						className="text-sm"
					/>
				</ReviewRow>
				<ReviewRow label="Category">
					{getCategoryDisplay(values, categories)}
				</ReviewRow>
				<ReviewRow label="Declared Value">
					{getDeclaredValueDisplay(values)}
				</ReviewRow>
			</ReviewSection>

			<ReviewSection title="Entries & Schedule" onEdit={handleEditTickets}>
				<ReviewRow label="Price per entry">
					{getPricePerTicketDisplay(values)}
				</ReviewRow>
				<ReviewRow label="Winners">{getWinnersDisplay(values)}</ReviewRow>
				<ReviewRow label="Participants">
					{getParticipantsRangeDisplay(values)}
				</ReviewRow>
				<ReviewRow label="Active period">
					{getActivePeriodDisplay(values)}
				</ReviewRow>
				<ReviewRow label="Payment">
					{getPaymentSummaryDisplay(values)}
				</ReviewRow>
			</ReviewSection>

			{showStartNowBanner ? (
				<div className="flex w-full items-center justify-between rounded-lg bg-sky-100 p-4">
					<div className="flex items-center gap-2">
						<Clock className="text-brand-blue size-6" />
						<span className="text-xs">
							The sweepstakes will start immediately after saving.
						</span>
					</div>
				</div>
			) : null}

			<div className="flex items-center gap-2">
				<Button
					type="submit"
					disabled={isUpdating || !hasChanges}
					className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isUpdating ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</div>
	);
}

interface GallerySlotProps {
	/** Resolved source URL for this slot — `null` renders a placeholder icon. */
	src: string | null;
	/** Zero-based gallery slot index (0..2) — used for the `alt` attribute. */
	index: number;
	/** Whether `src` is a blob URL — Next's image pipeline can't transform blobs. */
	isBlob: boolean;
}

/**
 * Single gallery preview slot. Extracted to keep the parent composer's JSX
 * flat (three nesting levels) and to let the slot decide between the
 * fallback icon and the Next `Image` without deeper ternary branching.
 *
 * @returns Square preview slot with either the image or the empty-state icon.
 */
function GallerySlot({ src, index, isBlob }: GallerySlotProps) {
	return (
		<div className="border-ink-200 relative flex aspect-square max-h-24 w-full items-center justify-center overflow-hidden rounded-lg border bg-white">
			{src ? (
				<Image
					src={src}
					alt={`Gallery ${index + 1}`}
					fill
					sizes="33vw"
					className="object-cover"
					unoptimized={isBlob}
				/>
			) : (
				<ImageIcon className="size-6 text-gray-400" />
			)}
		</div>
	);
}
