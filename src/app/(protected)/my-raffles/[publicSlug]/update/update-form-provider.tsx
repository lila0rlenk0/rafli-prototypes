'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
	createContext,
	useCallback,
	useContext,
	useState,
	type ReactNode,
} from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';

import { createUpdate } from '@/services/update/create-update';
import { uploadUpdateImages } from '@/services/update/upload-update-images';
import { updateFormSchema, type UpdateFormData } from './schema';

interface UpdateFormContextType {
	form: UseFormReturn<UpdateFormData>;
	onSubmit: (data: UpdateFormData) => void;
	isSubmitting: boolean;
	raffleId: string;
	publicSlug: string;
}

const UpdateFormContext = createContext<UpdateFormContextType | undefined>(
	undefined,
);

interface UpdateFormProviderProps {
	children: ReactNode;
	raffleId: string;
	publicSlug: string;
}

/**
 * UpdateFormProvider Component
 *
 * Provides form context for creating raffle updates.
 * Uses two-phase submit: create update first, then upload images.
 *
 * @param children - Child components
 * @param raffleId - The ID of the raffle
 * @param publicSlug - The public slug for redirects
 */
export function UpdateFormProvider({
	children,
	raffleId,
	publicSlug,
}: UpdateFormProviderProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<UpdateFormData>({
		resolver: zodResolver(updateFormSchema),
		mode: 'onChange',
		defaultValues: {
			text: '',
			images: [],
		},
	});

	/**
	 * Handles form submission using two-phase flow:
	 * 1. Creates update with text only
	 * 2. Uploads images to the created update (if any)
	 *
	 * @param data - Validated form data
	 */
	const handleSubmit = useCallback(
		async (data: UpdateFormData) => {
			setIsSubmitting(true);

			try {
				// Phase 1: Create the update with text only
				const createResult = await createUpdate(raffleId, {
					text: data.text,
				});

				if (!createResult.success) {
					toast.error('Failed to create update. Please try again.');
					setIsSubmitting(false);
					return;
				}

				const updateId = createResult.data.id;

				// Phase 2: Upload images if any
				if (data.images && data.images.length > 0) {
					const uploadResult = await uploadUpdateImages(updateId, data.images);

					if (!uploadResult.success) {
						// Update was created but images failed
						// Show warning but still redirect since update exists
						toast.warning(
							'Update posted, but some images failed to upload. You can try adding them later.',
						);
						form.reset();
						router.push(`/browse/${publicSlug}`);
						return;
					}
				}

				toast.success('Update posted successfully!');

				// Reset form
				form.reset();

				// Redirect to raffle page
				router.push(`/browse/${publicSlug}`);
			} catch (error) {
				console.error('Create update error:', error);
				toast.error('Something went wrong. Please try again.');
				setIsSubmitting(false);
			}
		},
		[raffleId, publicSlug, router, form],
	);

	return (
		<UpdateFormContext.Provider
			value={{
				form,
				onSubmit: handleSubmit,
				isSubmitting,
				raffleId,
				publicSlug,
			}}
		>
			{children}
		</UpdateFormContext.Provider>
	);
}

/**
 * Hook to access the update form context
 * Must be used within an UpdateFormProvider
 *
 * @returns The update form context
 * @throws Error if used outside of UpdateFormProvider
 */
export function useUpdateForm() {
	const context = useContext(UpdateFormContext);
	if (!context) {
		throw new Error('useUpdateForm must be used within UpdateFormProvider');
	}
	return context;
}
