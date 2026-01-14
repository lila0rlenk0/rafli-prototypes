'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useState,
} from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { RaffleCreatedModal } from '@/components/raffle/raffle-created-modal';
import { createRaffle } from '@/services/raffle/create-raffle';
import { uploadCover } from '@/services/raffle/upload-cover';
import { uploadGalleryImages } from '@/services/raffle/upload-gallery';
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
}

const MultiStepFormContext = createContext<
	MultiStepFormContextType | undefined
>(undefined);

interface MultiStepFormProviderProps {
	children: ReactNode;
	userName: string;
	totalRaffles: number;
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
}: MultiStepFormProviderProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [createdRaffle, setCreatedRaffle] = useState<{
		raffleId: string;
		raffleStartDate: string;
	} | null>(null);

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
		},
	});

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
	const handleCreateRaffle = useCallback(async (data: RaffleFormData) => {
		setIsCreating(true);

		try {
			const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
				const galleryResult = await uploadGalleryImages(raffleId, galleryFiles);
				if (!galleryResult.success) {
					console.error('Gallery upload failed:', galleryResult.error);
					toast.error('Raffle created but gallery upload failed.');
				}
			}

			// Open success modal instead of redirecting
			setCreatedRaffle({
				raffleId,
				raffleStartDate: data.startDate,
			});
			setIsModalOpen(true);
		} catch (error) {
			console.error('Create raffle error:', error);
			toast.error('Something went wrong. Please try again');
		} finally {
			setIsCreating(false);
		}
	}, []);

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
			}}
		>
			{children}
			{createdRaffle && (
				<RaffleCreatedModal
					raffleId={createdRaffle.raffleId}
					raffleStartDate={createdRaffle.raffleStartDate}
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
				/>
			)}
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
