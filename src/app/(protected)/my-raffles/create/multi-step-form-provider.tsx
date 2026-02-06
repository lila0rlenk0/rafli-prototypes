'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { RaffleCreatedModal } from '@/components/raffle/raffle-created-modal';
import { createRaffle } from '@/services/raffle/create-raffle';
import { publishRaffle } from '@/services/raffle/publish-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
import type { Category } from '@/types/category';
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
					toast.error('Failed to create raffle');
					return;
				}

				const raffleId = result.data.id;

				if (data.coverImage && data.coverImage.length > 0) {
					const coverResult = await uploadCover(raffleId, data.coverImage[0]);
					if (!coverResult.success) {
						console.error('Cover upload failed:', coverResult.error);
						toast.error('Raffle created but cover upload failed.');
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

				// Auto-publish if start date is today or in the past
				const startDate = new Date(data.startDate);
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				startDate.setHours(0, 0, 0, 0);

				if (startDate <= today) {
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
				form.reset();
				setCurrentStep(0);

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
		[clearDraft, form],
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

	return (
		<MultiStepFormContext.Provider
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
				isCreating,
				isRaffleCreated: createdRaffle !== null,
				userName,
				totalRaffles,
				hasUnsavedChanges,
				setShowExitModal,
				questions,
				categories,
			}}
		>
			{children}
			{createdRaffle && (
				<RaffleCreatedModal
					publicSlug={createdRaffle.publicSlug}
					raffleStartDate={createdRaffle.raffleStartDate}
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
				/>
			)}
			<SaveDraftModal
				open={showExitModal}
				onOpenChange={setShowExitModal}
				onStay={handleStay}
				onSaveDraft={handleSaveDraft}
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
