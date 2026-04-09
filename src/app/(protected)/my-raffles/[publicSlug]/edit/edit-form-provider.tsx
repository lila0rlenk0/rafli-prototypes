'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { PublishMode } from '@/components/raffle/publish-split-button';
import { computeRaffleDiff, hasRaffleChanges } from '@/lib/utils/raffle-diff';
import type { Category } from '@/types/category';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { Question } from '@/types/question';
import { publishRaffle } from '@/services/raffle/publish-raffle';
import { updateRaffle } from '@/services/raffle/update-raffle';
import { usePublishRaffle } from '@/services/raffle/use-publish-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
import { RAFFLE_STATUS } from '@/types/raffle';
import type { Raffle } from '@/types/raffle';

import { computeRestrictions } from './compute-restrictions';
import { editFormSchema, type FieldRestrictions } from './schema';
import { STEPS } from './steps';

type EditFormData = z.infer<typeof editFormSchema>;

interface EditFormContextType {
	currentStep: number;
	totalSteps: number;
	form: UseFormReturn<EditFormData>;
	nextStep: () => void;
	previousStep: () => void;
	goToStep: (step: number) => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	onSubmit: (data: EditFormData) => void;
	isUpdating: boolean;
	isPublishing: boolean;
	handlePublish: (mode: PublishMode) => void;
	restrictions: FieldRestrictions;
	originalRaffle: Raffle;
	existingCoverUrl: string | null;
	existingGalleryUrls: string[];
	questions: Question[];
	categories: Category[];
	userName: string;
	totalRaffles: number;
}

const EditFormContext = createContext<EditFormContextType | undefined>(
	undefined,
);

interface EditFormProviderProps {
	children: ReactNode;
	raffle: Raffle;
	initialCoverUrl: string | null;
	initialGalleryUrls: string[];
	defaultValues: EditFormData;
	questions: Question[];
	categories: Category[];
	userName: string;
	totalRaffles: number;
}

/**
 * Context provider for the multi-step raffle edit form.
 * Handles field restrictions, diff computation, and partial updates.
 */
export function EditFormProvider({
	children,
	raffle,
	initialCoverUrl,
	initialGalleryUrls,
	defaultValues,
	questions,
	categories,
	userName,
	totalRaffles,
}: EditFormProviderProps) {
	const router = useRouter();
	// Wizard navigation — 0-indexed step position
	const [currentStep, setCurrentStep] = useState(0);
	// Tracks in-flight API calls during raffle update to disable submit
	const [isUpdating, setIsUpdating] = useState(false);
	// usePublishRaffle: encapsulates publish logic + "go live now" vs "schedule" split
	const { isPublishing, handlePublish } = usePublishRaffle({
		raffleId: raffle.id,
		startAt: raffle.startAt,
	});

	const totalSteps = STEPS.length;

	const form = useForm<EditFormData>({
		resolver: zodResolver(editFormSchema),
		mode: 'onChange',
		defaultValues,
	});

	// useMemo: restrictions derive from raffle state — recompute only when raffle
	// object changes (which only happens on page navigation, not mid-edit)
	const restrictions = useMemo(() => computeRestrictions(raffle), [raffle]);

	const existingCoverUrl = initialCoverUrl;
	const existingGalleryUrls = initialGalleryUrls;

	const nextStep = useCallback(() => {
		if (currentStep < totalSteps - 1) {
			setCurrentStep(prev => prev + 1);
		}
	}, [currentStep, totalSteps]);

	const previousStep = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(prev => prev - 1);
		}
	}, [currentStep]);

	const goToStep = useCallback(
		(step: number) => {
			if (step >= 0 && step < totalSteps) {
				setCurrentStep(step);
			}
		},
		[totalSteps],
	);

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;

	/**
	 * Maps server error codes to user-facing messages and optional form field targets
	 * Field-targeted errors trigger form.setError + navigate to the relevant step
	 */
	function getRaffleServerError(code: RaffleErrorCode): {
		message: string;
		field?: keyof EditFormData;
	} {
		switch (code) {
			case RAFFLE_ERROR_CODES.MIN_PARTICIPANTS_MUST_EXCEED_WINNERS:
				return {
					message:
						'Minimum participants must be greater than the number of winners',
					field: 'minParticipants',
				};
			case RAFFLE_ERROR_CODES.INVALID_DATES:
				return {
					message: 'Invalid dates. End date must be after start date.',
					field: 'endDate',
				};
			case RAFFLE_ERROR_CODES.NOT_DRAFT:
				return {
					message: 'Raffle is not in draft status and cannot be edited',
				};
			case RAFFLE_ERROR_CODES.PERMISSION_DENIED:
				return {
					message: 'You do not have permission to perform this action',
				};
			case RAFFLE_ERROR_CODES.MISSING_FIELDS:
				return { message: 'Some required fields are missing' };
			default:
				return { message: 'Failed to update raffle' };
		}
	}

	/**
	 * Multi-phase raffle update pipeline:
	 * 1. Check for actual changes (images or field diff)
	 * 2. Validate category and question presence
	 * 3. Compute and send field diff (partial update)
	 * 4. Upload new cover image (if provided)
	 * 5. Upload new gallery images (if provided)
	 * 6. Auto-publish draft if start datetime is now/past
	 * 7. Navigate back to my-raffles
	 */
	const handleUpdateRaffle = useCallback(
		async (data: EditFormData) => {
			setIsUpdating(true);

			try {
				// Step 1: Check for actual changes — button should be disabled, but double-check
				const hasNewImages = data.coverImage && data.coverImage.length > 0;
				const hasFieldChanges = hasRaffleChanges(
					raffle,
					data,
					data.category,
					data.checkInQuestion,
				);
				if (!hasNewImages && !hasFieldChanges) {
					return;
				}

				// Step 2: Validate required selects (not covered by Zod since they're UUIDs)
				if (!data.category) {
					toast.error('Invalid category selected');
					return;
				}

				if (!data.checkInQuestion) {
					toast.error('Please select a check-in question');
					return;
				}

				// Step 3: Partial update — only send fields that changed
				const diff = computeRaffleDiff(
					raffle,
					data,
					data.category,
					data.checkInQuestion,
				);

				if (Object.keys(diff).length > 0) {
					const result = await updateRaffle(raffle.id, diff);

					if (!result.success) {
						const { message, field } = getRaffleServerError(result.error);
						toast.error(message);
						if (field) {
							form.setError(field, { message });
							// Tickets step = index 1 (minParticipants, endDate live there)
							setCurrentStep(1);
						}
						return;
					}
				}

				// Step 4: Upload new cover image (first file in coverImage array)
				if (data.coverImage && data.coverImage.length > 0) {
					const coverResult = await uploadCover(raffle.id, data.coverImage[0]);
					if (!coverResult.success) {
						console.error('Cover upload failed:', coverResult.error);
						toast.error('Raffle updated but cover upload failed.');
					}
				}

				// Step 5: Upload new gallery images (slots 2+ of coverImage array)
				if (data.coverImage && data.coverImage.length > 1) {
					const galleryFiles = data.coverImage.slice(1);
					const galleryResult = await uploadGalleryImages(
						raffle.id,
						galleryFiles,
					);
					if (!galleryResult.success) {
						console.error('Gallery upload failed:', galleryResult.error);
						toast.error('Raffle updated but gallery upload failed.');
					}
				}

				// Step 6: Auto-publish draft if start datetime is now/past.
				// Queued raffles are already published — calling publishRaffle would fail with not-draft.
				if (raffle.status === RAFFLE_STATUS.DRAFT) {
					// Combine date + time for accurate past/future comparison
					const startDateTime = new Date(
						`${data.startDate}T${data.startTime || '00:00'}`,
					);

					if (startDateTime <= new Date()) {
						const publishResult = await publishRaffle(raffle.id);
						if (!publishResult.success) {
							console.error('Auto-publish failed:', publishResult.error);
							toast.warning(
								'Raffle updated but could not go live. Please go live manually from your dashboard.',
							);
						}
					}
				}

				toast.success('Raffle updated successfully!');

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
		[raffle, router, form, defaultValues],
	);

	const handleSubmit = useCallback(
		(data: EditFormData) => {
			if (isLastStep) {
				handleUpdateRaffle(data);
			} else {
				nextStep();
			}
		},
		[isLastStep, handleUpdateRaffle, nextStep],
	);

	return (
		<EditFormContext.Provider
			value={{
				currentStep,
				totalSteps,
				form,
				nextStep,
				previousStep,
				goToStep,
				isFirstStep,
				isLastStep,
				onSubmit: handleSubmit,
				isUpdating,
				isPublishing,
				handlePublish,
				restrictions,
				originalRaffle: raffle,
				existingCoverUrl,
				existingGalleryUrls,
				questions,
				categories,
				userName,
				totalRaffles,
			}}
		>
			{children}
		</EditFormContext.Provider>
	);
}

/**
 * Hook to access the edit form context
 * Must be used within an EditFormProvider
 *
 * @returns The edit form context containing form state and navigation methods
 * @throws Error if used outside of EditFormProvider
 */
export function useEditForm() {
	const context = useContext(EditFormContext);
	if (!context) {
		throw new Error('useEditForm must be used within EditFormProvider');
	}
	return context;
}
