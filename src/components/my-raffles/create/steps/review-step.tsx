'use client';

import { Clock } from 'lucide-react';

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
	getPromoCodesCountDisplay,
	getWinnersDisplay,
	willStartImmediately,
} from '@/components/my-raffles/shared/review/field-getters';

import { useMultiStepForm } from '@/components/my-raffles/create/multi-step-form-provider';
import { ImagePreview } from './image-preview';

// Wizard step indexes — kept in sync with `./index.ts`. Centralized here so
// the onEdit handlers stay readable at the call site.
const BASIC_INFO_STEP = 0;
const TICKETS_STEP = 1;

/**
 * Final step of the raffle creation wizard. Renders a read-only preview
 * built on top of the neutral `ReviewSection` / `ReviewRow` primitives so
 * the host can hop back to any prior step via the inline "Edit" buttons
 * before submitting.
 *
 * Image previews use `ImagePreview` for safe blob URL lifecycle — inline
 * `URL.createObjectURL` without a matching revoke would leak memory on
 * every re-render.
 *
 * @returns Review card with image grid, host identity, data sections, and
 *   the submit button that triggers raffle creation.
 */
export function ReviewStep() {
	const {
		form,
		isCreating,
		isRaffleCreated,
		userName,
		totalRaffles,
		categories,
		pendingPromoCodes,
		goToStep,
	} = useMultiStepForm();

	// form.watch() returns a fresh reference on every field change, forcing
	// a re-render so the review always mirrors what the user just typed.
	const values = form.watch();
	const coverImage = values.coverImage;
	const hostLabel = userName || 'Sweepstakes Host';
	const hostInitial = userName ? userName.charAt(0) : '';
	const hasPromoCodes = pendingPromoCodes.length > 0;
	const showStartNowWarning = willStartImmediately(values);

	function handleEditBasics() {
		goToStep(BASIC_INFO_STEP);
	}

	function handleEditTickets() {
		goToStep(TICKETS_STEP);
	}

	return (
		<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-8">
			<div className="flex flex-col gap-4">
				<div className="border-ink-200 relative flex aspect-video max-h-64 w-full items-center justify-center overflow-hidden rounded-lg border bg-white">
					<ImagePreview
						file={coverImage?.[0]}
						alt="Cover"
						className="object-cover"
					/>
				</div>
				<div className="grid grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, index) => (
						<div
							key={index}
							className="border-ink-200 relative flex aspect-square max-h-24 w-full items-center justify-center overflow-hidden rounded-lg border bg-white"
						>
							<ImagePreview
								file={coverImage?.[index + 1]}
								alt={`Preview ${index + 2}`}
								className="object-cover"
							/>
						</div>
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
				{hasPromoCodes ? (
					<ReviewRow label="Promo codes">
						{getPromoCodesCountDisplay(pendingPromoCodes)}
					</ReviewRow>
				) : null}
			</ReviewSection>

			{showStartNowWarning ? (
				<div className="flex w-full items-center justify-between rounded-lg bg-sky-100 p-4">
					<div className="flex items-center gap-2">
						<Clock className="text-brand-blue size-4" />
						<span className="text-sm">The sweepstakes will start now.</span>
					</div>
				</div>
			) : null}

			<div className="flex items-center gap-2">
				<Button
					type="submit"
					disabled={isCreating || isRaffleCreated}
					className="cursor-pointer"
				>
					{isCreating ? 'Creating...' : 'Create'}
				</Button>
			</div>
		</div>
	);
}
