'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { computeRaffleDiff, hasRaffleChanges } from '@/lib/utils/raffle-diff';
import type { Category } from '@/types/category';
import type { Question } from '@/types/question';
import { publishRaffle } from '@/services/raffle/publish-raffle';
import { updateRaffle } from '@/services/raffle/update-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
import { RAFFLE_STATUS } from '@/types/raffle';
import type { Raffle, SignedMediaUrl } from '@/types/raffle';

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
	initialGalleryUrls: SignedMediaUrl[];
	defaultValues: EditFormData;
	questions: Question[];
	categories: Category[];
	userName: string;
	totalRaffles: number;
}

/**
 * Checks if form has any changes compared to original default values
 * Also checks for new image uploads
 *
 * @param formData - Current form data
 * @param originalDefaults - Original default values
 * @returns true if there are changes, false otherwise
 */
function hasFormChanges(
	formData: EditFormData,
	originalDefaults: EditFormData,
): boolean {
	// Check for new images
	const hasNewImages = formData.coverImage && formData.coverImage.length > 0;
	if (hasNewImages) {
		return true;
	}

	// Check field changes (excluding coverImage which is handled separately)
	return (
		formData.title !== originalDefaults.title ||
		formData.description !== originalDefaults.description ||
		formData.price !== originalDefaults.price ||
		formData.category !== originalDefaults.category ||
		formData.startDate !== originalDefaults.startDate ||
		formData.endDate !== originalDefaults.endDate ||
		formData.pricePerTicket !== originalDefaults.pricePerTicket ||
		formData.numberOfWinners !== originalDefaults.numberOfWinners ||
		formData.minParticipants !== originalDefaults.minParticipants ||
		formData.maxParticipants !== originalDefaults.maxParticipants ||
		formData.checkInQuestion !== originalDefaults.checkInQuestion
	);
}

/**
 * EditFormProvider Component
 *
 * Provides a context for managing multi-step raffle edit form state.
 * Similar to MultiStepFormProvider but for editing existing raffles.
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
	const [currentStep, setCurrentStep] = useState(0);
	const [isUpdating, setIsUpdating] = useState(false);

	const totalSteps = STEPS.length;

	const form = useForm<EditFormData>({
		resolver: zodResolver(editFormSchema),
		mode: 'onChange',
		defaultValues,
	});

	// Store original default values for comparison (only set once on mount)
	const originalDefaultsRef = useRef(defaultValues);

	// Compute restrictions based on raffle state
	const restrictions = useMemo(() => computeRestrictions(raffle), [raffle]);

	// Extract existing image URLs
	const existingCoverUrl = initialCoverUrl;
	const existingGalleryUrls = initialGalleryUrls.map(img => img.url);

	/**
	 * Advances to the next step in the form
	 * Does nothing if already on the last step
	 */
	const nextStep = useCallback(() => {
		if (currentStep < totalSteps - 1) {
			setCurrentStep(prev => prev + 1);
		}
	}, [currentStep, totalSteps]);

	/**
	 * Returns to the previous step in the form
	 * Does nothing if already on the first step
	 */
	const previousStep = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(prev => prev - 1);
		}
	}, [currentStep]);

	/**
	 * Navigates to a specific step in the form
	 * @param step - The step index to navigate to (0-based)
	 */
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
	 * Handles raffle update by computing diff and calling the update service
	 * Only sends changed fields to the backend (partial update)
	 *
	 * @param data - The validated edit form data
	 */
	const handleUpdateRaffle = useCallback(
		async (data: EditFormData) => {
			setIsUpdating(true);

			try {
				// First check if form has any changes compared to original defaults
				// Button should be disabled if no changes, but double-check here as safety
				if (!hasFormChanges(data, originalDefaultsRef.current)) {
					setIsUpdating(false);
					return;
				}

				// Category is now stored as UUID directly from the backend
				if (!data.category) {
					toast.error('Invalid category selected');
					setIsUpdating(false);
					return;
				}

				// checkInQuestion now stores the question UUID directly
				if (!data.checkInQuestion) {
					toast.error('Please select a check-in question');
					setIsUpdating(false);
					return;
				}

				// Check if there are any field changes (excluding images)
				const hasFieldChanges = hasRaffleChanges(
					raffle,
					data,
					data.category,
					data.checkInQuestion,
				);
				const hasNewImages = data.coverImage && data.coverImage.length > 0;

				// If no field changes and no new images, nothing to save
				// Button should be disabled if no changes, but double-check here as safety
				if (!hasFieldChanges && !hasNewImages) {
					setIsUpdating(false);
					return;
				}

				// Compute diff for partial update
				const diff = computeRaffleDiff(
					raffle,
					data,
					data.category,
					data.checkInQuestion,
				);

				// Only call update if there are field changes
				if (Object.keys(diff).length > 0) {
					const result = await updateRaffle(raffle.id, diff);

					if (!result.success) {
						toast.error('Failed to update raffle');
						return;
					}
				}

				// Upload new cover if provided
				if (data.coverImage && data.coverImage.length > 0) {
					const coverResult = await uploadCover(raffle.id, data.coverImage[0]);
					if (!coverResult.success) {
						console.error('Cover upload failed:', coverResult.error);
						toast.error('Raffle updated but cover upload failed.');
					}
				}

				// Upload new gallery images if provided (additional images beyond cover)
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

				// Auto-publish if start date changed to today or past and raffle is draft/queued
				const isDraftOrQueued =
					raffle.status === RAFFLE_STATUS.DRAFT ||
					raffle.status === RAFFLE_STATUS.QUEUED;

				if (isDraftOrQueued) {
					const startDate = new Date(data.startDate);
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					startDate.setHours(0, 0, 0, 0);

					if (startDate <= today) {
						const publishResult = await publishRaffle(raffle.id);
						if (!publishResult.success) {
							console.error('Auto-publish failed:', publishResult.error);
							toast.warning(
								'Raffle updated but could not go live. Please publish it manually.',
							);
						}
					}
				}

				toast.success('Raffle updated successfully!');

				// Reset form state before redirect
				form.reset(defaultValues);
				setCurrentStep(0);

				router.push('/my-raffles');
			} catch (error) {
				console.error('Update raffle error:', error);
				toast.error('Something went wrong. Please try again');
				setIsUpdating(false);
			}
		},
		[raffle, router, form, defaultValues],
	);

	/**
	 * Handles form submission
	 * Advances to the next step or triggers raffle update on the last step
	 *
	 * @param data - The validated edit form data
	 */
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
