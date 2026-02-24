'use client';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from '@/components/ui/dropzone';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { ImagePreviewCard } from '@/components/ui/image-preview-card';
import { Input } from '@/components/ui/input';
import { generateSlugPreview } from '@/lib/utils/slug-preview';
import { DollarSign, X } from 'lucide-react';
import { useRef, useMemo, useState } from 'react';
import { STEPS } from '.';
import { DescriptionEditor } from '../description-editor';
import { useMultiStepForm } from '../multi-step-form-provider';
import { MAX_FILE_SIZE } from '../schema';

export function BasicInfoStep() {
	const {
		form,
		currentStep: stepIndex,
		nextStep,
		categories,
	} = useMultiStepForm();
	const {
		register,
		formState: { errors, touchedFields },
		watch,
		setValue,
		trigger,
	} = form;

	const currentStep = STEPS[stepIndex];

	// Watch fields from this step only
	const title = watch('title');
	const description = watch('description');
	const price = watch('price');
	const category = watch('category');
	const coverImage = watch('coverImage');

	// State for lightbox preview
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);

	// Ref to Dropzone wrapper for triggering file picker from empty slots
	const dropzoneRef = useRef<HTMLDivElement>(null);

	// Generate slug preview
	const previewSlugPath = useMemo(() => {
		if (!title || title.trim().length === 0) {
			return null;
		}

		const slugPreview = generateSlugPreview(title);

		return `/browse/${slugPreview}`;
	}, [title]);

	/**
	 * Transforms categories into combobox options format
	 * Uses category id as value (backend UUID)
	 */
	const categoryOptions = useMemo(
		() =>
			categories.map(cat => ({
				value: cat.id,
				label: cat.name,
			})),
		[categories],
	);

	// Check if any field in this step is filled
	const hasFilledFields = Boolean(
		title ||
		description ||
		(price && price >= 0.5) ||
		category ||
		(coverImage && coverImage.length > 0),
	);

	// Check if all fields in this step are filled and valid
	const isCurrentStepValid =
		Boolean(title) &&
		Boolean(description) &&
		Boolean(price && price >= 0.5) &&
		Boolean(category) &&
		!errors.title &&
		!errors.description &&
		!errors.price &&
		!errors.category;

	// Clear only this step's fields
	function handleClearAll() {
		setValue('title', '');
		setValue('description', '');
		setValue('price', 0);
		setValue('category', '');
		setValue('coverImage', []);
	}

	/**
	 * Removes an image from the coverImage array at the given index
	 * @param index - Position of the image to remove
	 */
	function handleRemoveImage(index: number) {
		if (!coverImage) return;
		const newImages = coverImage.filter((_, i) => i !== index);
		setValue('coverImage', newImages);
	}

	/**
	 * Opens the lightbox preview for the image at the given index
	 * @param index - Position of the image to preview
	 */
	function handlePreviewImage(index: number) {
		setPreviewIndex(index);
	}

	/**
	 * Triggers the Dropzone file picker by clicking its hidden input
	 */
	function handleUploadClick() {
		const input = dropzoneRef.current?.querySelector('input[type="file"]');
		if (input) (input as HTMLInputElement).click();
	}

	// Handle continue with validation
	const handleContinue = async () => {
		// Trigger validation for current step fields
		const isValid = await trigger([
			'title',
			'description',
			'price',
			'category',
		]);

		if (isValid) {
			nextStep();
		}
	};

	return (
		<div className="flex w-full flex-col gap-8 rounded-2xl bg-white p-8">
			<h2 className="mb-6 text-xl font-semibold">{currentStep.title}</h2>

			<div className="flex flex-col gap-2" ref={dropzoneRef}>
				<label htmlFor="coverImage" className="font-medium">
					Cover Image
				</label>
				<Dropzone
					src={coverImage}
					accept={{
						'image/png': ['.png'],
						'image/jpeg': ['.jpg', '.jpeg'],
						'audio/mp3': ['.mp3'],
					}}
					maxSize={MAX_FILE_SIZE}
					maxFiles={4}
					onDrop={acceptedFiles => {
						setValue('coverImage', [...(coverImage || []), ...acceptedFiles]);
					}}
					className="w-full rounded-lg border-[#E5E5E5] bg-white hover:bg-white"
				>
					<DropzoneEmptyState />
					<DropzoneContent />
				</Dropzone>
				{touchedFields.coverImage && errors.coverImage && (
					<span className="text-sm text-red-500">
						{errors.coverImage.message}
					</span>
				)}

				<div className="grid grid-cols-4 gap-4">
					{Array.from({ length: 4 }).map((_, index) => {
						const file = coverImage?.[index] ?? null;
						return (
							<ImagePreviewCard
								key={index}
								src={file}
								alt={`Preview ${index + 1}`}
								index={index}
								onRemove={file ? handleRemoveImage : undefined}
								onPreview={file ? handlePreviewImage : undefined}
								onUpload={file ? undefined : handleUploadClick}
							/>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="title" className="font-medium">
					Raffle title
				</label>
				<Input
					id="title"
					type="text"
					placeholder="Smart Watch"
					className="border-[#E5E5E5]"
					aria-invalid={!!errors.title}
					aria-describedby={errors.title ? 'title-error' : undefined}
					{...register('title')}
				/>
				{touchedFields.title && errors.title && (
					<span className="text-sm text-red-500">{errors.title.message}</span>
				)}
				<p className="text-muted-foreground min-h-[20px] text-sm">
					{previewSlugPath && `Your raffle page: ${previewSlugPath}`}
				</p>
			</div>

			<DescriptionEditor control={form.control} trigger={trigger} />

			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2">
					<label htmlFor="price" className="font-medium">
						Declared value
					</label>
					<div className="relative">
						<DollarSign className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
						<Input
							id="price"
							type="number"
							step="0.01"
							min="0.5"
							className="border-[#E5E5E5] pl-9"
							placeholder="0.50"
							{...register('price', { valueAsNumber: true })}
						/>
					</div>
					{touchedFields.price && errors.price && (
						<span className="text-sm text-red-500">{errors.price.message}</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label htmlFor="category" className="font-medium">
						Category
					</label>
					<Combobox
						options={categoryOptions}
						value={category}
						onValueChange={value => setValue('category', value)}
						placeholder="Select category"
						searchPlaceholder="Search category..."
						emptyText="No category found."
					/>
					{touchedFields.category && errors.category && (
						<span className="text-sm text-red-500">
							{errors.category.message}
						</span>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button
					type="button"
					onClick={handleContinue}
					disabled={!isCurrentStepValid}
					className="cursor-pointer disabled:cursor-not-allowed disabled:bg-black disabled:opacity-70"
				>
					Continue
				</Button>

				<Button
					variant="ghost"
					type="button"
					onClick={handleClearAll}
					disabled={!hasFilledFields}
					className="flex cursor-pointer items-center gap-2"
				>
					<X className="size-4" />
					<span className="text-sm font-semibold">Clear all</span>
				</Button>
			</div>

			{/* Image Lightbox for full-screen preview */}
			<ImageLightbox
				images={coverImage ?? []}
				currentIndex={previewIndex ?? 0}
				open={previewIndex !== null}
				onOpenChange={open => {
					if (!open) setPreviewIndex(null);
				}}
				onNavigate={setPreviewIndex}
			/>
		</div>
	);
}
