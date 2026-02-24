'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { CreatePromoCodeData } from '@/components/promo-code/create-promo-code-modal';
import { RaffleCreatedModal } from '@/components/raffle/raffle-created-modal';
import { bulkCreatePromoCodes } from '@/services/promo-code/bulk-create-promo-codes';
import { createRaffle } from '@/services/raffle/create-raffle';
import { publishRaffle } from '@/services/raffle/publish-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
import type { Category } from '@/types/category';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { Question } from '@/types/question';
import { useRaffleDraft } from './hooks/use-raffle-draft';
import { SaveDraftModal } from './save-draft-modal';
import { raffleFormSchema } from './schema';
import { STEPS } from './steps';

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
	pendingPromoCodes: CreatePromoCodeData[];
	addPendingPromoCode: (data: CreatePromoCodeData) => void;
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
 * MultiStepFormProvider Component
 *
 * Provides a context for managing multi-step raffle creation form state.
 * Handles form navigation, validation, and raffle creation with image uploads.
 * Uses React Hook Form for form management and includes optimized memoization
 * to prevent unnecessary re-renders in consuming components.
 */
export function MultiStepFormProvider({
	children,
	userName,
	totalRaffles,
	questions,
	categories,
}: MultiStepFormProviderProps) {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showExitModal, setShowExitModal] = useState(false);
	const [draftLoaded, setDraftLoaded] = useState(false);
	const [createdRaffle, setCreatedRaffle] = useState<{
		publicSlug: string;
		raffleStartDate: string;
	} | null>(null);
	const [pendingPromoCodes, setPendingPromoCodes] = useState<
		CreatePromoCodeData[]
	>([]);

	/**
	 * Adds a promo code batch to the pending list
	 */
	const addPendingPromoCode = useCallback((data: CreatePromoCodeData) => {
		setPendingPromoCodes(prev => [...prev, data]);
	}, []);

	/**
	 * Removes a promo code batch from the pending list by index
	 */
	const removePendingPromoCode = useCallback((index: number) => {
		setPendingPromoCodes(prev => prev.filter((_, i) => i !== index));
	}, []);

	/**
	 * Clears all pending promo codes
	 */
	const clearPendingPromoCodes = useCallback(() => {
		setPendingPromoCodes([]);
	}, []);

	const {
		draft,
		hasDraft,
		saveDraft,
		clearDraft,
		isLoading: isDraftLoading,
	} = useRaffleDraft();

	const totalSteps = STEPS.length;

	const form = useForm<RaffleFormData>({
		resolver: zodResolver(raffleFormSchema),
		mode: 'onChange',
		defaultValues: {
			title: '',
			description: '',
			price: 0,
			category: '',
			coverImage: [],
			startDate: '',
			endDate: '',
			pricePerTicket: 0,
			numberOfWinners: 0,
			minParticipants: 0,
			maxParticipants: 0,
			checkInQuestion: '',
		},
	});

	const formValues = form.watch();

	/**
	 * Checks if the form has any unsaved changes
	 * Returns true if any field has non-default values
	 */
	function checkHasUnsavedChanges(): boolean {
		return (
			formValues.title !== '' ||
			formValues.description !== '' ||
			formValues.price !== 0 ||
			formValues.category !== '' ||
			formValues.startDate !== '' ||
			formValues.endDate !== '' ||
			formValues.pricePerTicket !== 0 ||
			formValues.numberOfWinners !== 0 ||
			formValues.minParticipants !== 0 ||
			formValues.maxParticipants !== 0 ||
			formValues.checkInQuestion !== '' ||
			(formValues.coverImage?.length ?? 0) > 0
		);
	}

	const hasUnsavedChanges = checkHasUnsavedChanges();

	/**
	 * Loads draft data into form on mount
	 * Shows toast about re-uploading images
	 * Draft is only cleared on successful raffle creation
	 */
	useEffect(() => {
		if (isDraftLoading || draftLoaded || !hasDraft || !draft) return;

		form.reset({
			title: draft.title,
			description: draft.description,
			price: draft.price,
			category: draft.category,
			coverImage: [],
			startDate: draft.startDate,
			endDate: draft.endDate,
			pricePerTicket: draft.pricePerTicket,
			numberOfWinners: draft.numberOfWinners,
			minParticipants: draft.minParticipants,
			maxParticipants: draft.maxParticipants,
			checkInQuestion: draft.checkInQuestion || '',
		});

		setCurrentStep(draft.currentStep);
		setDraftLoaded(true);

		toast.info('Draft restored. Please re-upload your images if needed.');
	}, [isDraftLoading, draftLoaded, hasDraft, draft, form]);

	/**
	 * Adds beforeunload event listener when form has unsaved changes
	 * Shows browser's native "Leave site?" dialog
	 */
	useEffect(() => {
		if (!hasUnsavedChanges) return;

		function handleBeforeUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
		}

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}, [hasUnsavedChanges]);

	/**
	 * Saves current form data as draft and navigates to my-raffles
	 */
	const handleSaveDraft = useCallback(() => {
		const values = form.getValues();
		saveDraft(
			{
				title: values.title,
				description: values.description,
				price: values.price,
				category: values.category,
				startDate: values.startDate,
				endDate: values.endDate,
				pricePerTicket: values.pricePerTicket,
				numberOfWinners: values.numberOfWinners,
				minParticipants: values.minParticipants,
				maxParticipants: values.maxParticipants,
				checkInQuestion: values.checkInQuestion,
				currentStep,
			},
			currentStep,
		);
		toast.success('Draft saved successfully!');
		router.push('/my-raffles');
	}, [form, saveDraft, currentStep, router]);

	/**
	 * Closes the exit modal without saving
	 */
	const handleStay = useCallback(() => {
		setShowExitModal(false);
	}, []);

	/**
	 * Navigates to my-raffles without saving draft
	 */
	const handleLeaveWithoutSaving = useCallback(() => {
		router.push('/my-raffles');
	}, [router]);

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
	const isRaffleCreated = createdRaffle !== null;

	/**
	 * Maps server error codes to user-facing messages and optional form field targets
	 * Field-targeted errors trigger form.setError + navigate to the relevant step
	 */
	function getRaffleServerError(code: RaffleErrorCode): {
		message: string;
		field?: keyof RaffleFormData;
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
				return { message: 'Failed to create raffle' };
		}
	}

	/**
	 * Handles raffle creation by calling the server action
	 * Shows modal on success instead of redirecting immediately
	 *
	 * @param data - The validated raffle form data
	 */
	const handleCreateRaffle = useCallback(
		async (data: RaffleFormData) => {
			setIsCreating(true);

			try {
				const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

				// checkInQuestion now stores the question UUID directly
				if (!data.checkInQuestion) {
					toast.error('Please select a check-in question');
					setIsCreating(false);
					return;
				}

				const result = await createRaffle({
					title: data.title,
					description: data.description,
					price: data.price,
					category: data.category,
					startDate: data.startDate,
					endDate: data.endDate,
					pricePerTicket: data.pricePerTicket,
					numberOfWinners: data.numberOfWinners,
					minParticipants: data.minParticipants,
					maxParticipants: data.maxParticipants,
					checkInQuestion: data.checkInQuestion,
					timezone: userTimezone,
				});

				if (!result.success) {
					const { message, field } = getRaffleServerError(result.error);
					toast.error(message);
					// Navigate to the relevant step and set field-level error
					if (field) {
						form.setError(field, { message });
						// Tickets step = index 1 (minParticipants, endDate live there)
						setCurrentStep(1);
					}
					return;
				}

				const raffleId = result.data.id;
				let coverUploaded = false;

				if (data.coverImage && data.coverImage.length > 0) {
					const coverResult = await uploadCover(raffleId, data.coverImage[0]);
					if (!coverResult.success) {
						console.error('Cover upload failed:', coverResult.error);
						toast.error('Raffle created but cover upload failed.');
					} else {
						coverUploaded = true;
					}
				}

				if (data.coverImage && data.coverImage.length > 1) {
					const galleryFiles = data.coverImage.slice(1);
					const galleryResult = await uploadGalleryImages(
						raffleId,
						galleryFiles,
					);
					if (!galleryResult.success) {
						console.error('Gallery upload failed:', galleryResult.error);
						toast.error('Raffle created but gallery upload failed.');
					}
				}

				// Create pending promo codes
				if (pendingPromoCodes.length > 0) {
					let failedCount = 0;
					for (const promoCode of pendingPromoCodes) {
						const promoResult = await bulkCreatePromoCodes(raffleId, promoCode);
						if (!promoResult.success) {
							console.error('Promo code creation failed:', promoResult.error);
							failedCount++;
						}
					}
					if (failedCount > 0) {
						toast.error(
							`${failedCount} promo code batch${failedCount > 1 ? 'es' : ''} failed to create`,
						);
					}
				}

				// Auto-publish only if cover was uploaded (required for publish)
				const startDate = new Date(data.startDate);
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				startDate.setHours(0, 0, 0, 0);

				if (startDate <= today && coverUploaded) {
					const publishResult = await publishRaffle(raffleId);
					if (!publishResult.success) {
						console.error('Auto-publish failed:', publishResult.error);
						toast.warning(
							'Raffle created as draft. Please publish it manually.',
						);
					}
				}

				// Clear draft and reset form state for next creation
				clearDraft();
				form.reset({
					title: '',
					description: '',
					price: 0,
					category: '',
					coverImage: [],
					startDate: '',
					endDate: '',
					pricePerTicket: 0,
					numberOfWinners: 0,
					minParticipants: 0,
					maxParticipants: 0,
					checkInQuestion: '',
				});
				setCurrentStep(0);
				setPendingPromoCodes([]);

				// Open success modal instead of redirecting
				setCreatedRaffle({
					publicSlug: result.data.publicSlugOrCode,
					raffleStartDate: data.startDate,
				});
				setIsModalOpen(true);
			} catch (error) {
				console.error('Create raffle error:', error);
				toast.error('Something went wrong. Please try again');
			} finally {
				setIsCreating(false);
			}
		},
		[clearDraft, form, pendingPromoCodes],
	);

	/**
	 * Handles form submission
	 * Advances to the next step or triggers raffle creation on the last step
	 *
	 * @param data - The validated raffle form data
	 */
	const handleSubmit = useCallback(
		(data: RaffleFormData) => {
			if (isLastStep) {
				handleCreateRaffle(data);
			} else {
				nextStep();
			}
		},
		[isLastStep, handleCreateRaffle, nextStep],
	);

	// Memoize context value to prevent re-render cascades to consumers.
	// Most deps are stable refs (form, callbacks). The key insight: hasUnsavedChanges
	// flips to true on first keystroke and stays true — so subsequent keystrokes
	// don't produce a new context reference and consumers skip re-rendering.
	const contextValue = useMemo<MultiStepFormContextType>(
		() => ({
			currentStep,
			totalSteps,
			form,
			nextStep,
			previousStep,
			goToStep,
			isFirstStep,
			isLastStep,
			onSubmit: handleSubmit,
			isCreating,
			isRaffleCreated,
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
		}),
		[
			currentStep,
			totalSteps,
			form,
			nextStep,
			previousStep,
			goToStep,
			isFirstStep,
			isLastStep,
			handleSubmit,
			isCreating,
			isRaffleCreated,
			userName,
			totalRaffles,
			hasUnsavedChanges,
			questions,
			categories,
			pendingPromoCodes,
			addPendingPromoCode,
			removePendingPromoCode,
			clearPendingPromoCodes,
		],
	);

	return (
		<MultiStepFormContext.Provider value={contextValue}>
			{children}
			{createdRaffle && (
				<RaffleCreatedModal
					publicSlug={createdRaffle.publicSlug}
					raffleStartDate={createdRaffle.raffleStartDate}
					open={isModalOpen}
					onOpenChange={open => {
						setIsModalOpen(open);
						if (!open) setCreatedRaffle(null);
					}}
				/>
			)}
			<SaveDraftModal
				open={showExitModal}
				onOpenChange={setShowExitModal}
				onStay={handleStay}
				onSaveDraft={handleSaveDraft}
				onLeaveWithoutSaving={handleLeaveWithoutSaving}
			/>
		</MultiStepFormContext.Provider>
	);
}

/**
 * Hook to access the multi-step form context
 * Must be used within a MultiStepFormProvider
 *
 * @returns The multi-step form context containing form state and navigation methods
 * @throws Error if used outside of MultiStepFormProvider
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
