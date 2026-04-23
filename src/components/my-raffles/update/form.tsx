'use client';

import { Button } from '@/components/ui/button';
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from '@/components/ui/dropzone';
import { ImageLightbox } from '@/components/ui-custom/image-lightbox';
import { ImagePreviewCard } from '@/components/ui-custom/image-preview-card';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MAX_FILE_SIZE } from '@/lib/validation/raffle/update-form-schema';
import { UpdateDescriptionEditor } from './description-editor';
import { useUpdateForm } from './form-provider';

/**
 * UpdateForm Component
 *
 * Form for creating raffle updates.
 * Includes markdown text editor and optional image upload (max 5).
 */
export function UpdateForm() {
	const { form, onSubmit, isSubmitting, publicSlug } = useUpdateForm();
	const {
		formState: { errors, isValid },
		watch,
		setValue,
		handleSubmit,
	} = form;

	const images = watch('images');
	const text = watch('text');

	// State for lightbox preview
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);

	/**
	 * Removes an image from the images array at the given index
	 * @param index - Position of the image to remove
	 */
	function handleRemoveImage(index: number) {
		if (!images) return;
		const newImages = images.filter((_, i) => i !== index);
		setValue('images', newImages);
	}

	/**
	 * Opens the lightbox preview for the image at the given index
	 * @param index - Position of the image to preview
	 */
	function handlePreviewImage(index: number) {
		setPreviewIndex(index);
	}

	/**
	 * Check if form has any content
	 */
	function hasContent(): boolean {
		return Boolean(text?.trim()) || Boolean(images && images.length > 0);
	}

	/**
	 * Clear all form fields
	 */
	function handleClearAll() {
		setValue('text', '');
		setValue('images', []);
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="mx-auto flex w-full max-w-3xl flex-col gap-6"
		>
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link
					href={`/browse/${publicSlug}`}
					className="flex items-center gap-2 text-black"
				>
					<ArrowLeft className="size-5" />
					<span className="font-medium">Back to Sweepstakes</span>
				</Link>
			</div>

			{/* Form Card */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-6">
				<h1 className="font-clash-display text-2xl font-semibold">New post</h1>

				{/* Image Upload */}
				<div className="flex flex-col gap-2">
					<label htmlFor="images" className="font-medium">
						Images
					</label>
					<p className="text-sm text-gray-500">
						Add up to 5 images to your update
					</p>
					<Dropzone
						src={images}
						accept={{
							'image/png': ['.png'],
							'image/jpeg': ['.jpg', '.jpeg'],
							'image/webp': ['.webp'],
						}}
						maxSize={MAX_FILE_SIZE}
						maxFiles={5}
						onDrop={acceptedFiles => {
							const currentImages = images || [];
							const newImages = [...currentImages, ...acceptedFiles].slice(
								0,
								5,
							);
							setValue('images', newImages);
						}}
						className="border-ink-200 w-full rounded-lg bg-white hover:bg-white"
					>
						<DropzoneEmptyState />
						<DropzoneContent />
					</Dropzone>
					{errors.images ? (
						<span className="text-sm text-red-500">
							{errors.images.message}
						</span>
					) : null}

					{/* Image Previews - Always show 5 slots */}
					<div className="grid grid-cols-5 gap-2">
						{Array.from({ length: 5 }).map((_, index) => {
							const file = images?.[index] ?? null;
							return (
								<ImagePreviewCard
									key={index}
									src={file}
									alt={`Preview ${index + 1}`}
									index={index}
									onRemove={file ? handleRemoveImage : undefined}
									onPreview={file ? handlePreviewImage : undefined}
								/>
							);
						})}
					</div>
				</div>

				{/* Description Editor */}
				<UpdateDescriptionEditor />

				{/* Actions */}
				<div className="flex items-center gap-2">
					<Button
						type="submit"
						disabled={!isValid || isSubmitting}
						className="cursor-pointer disabled:cursor-not-allowed disabled:bg-black disabled:opacity-70"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Posting...
							</>
						) : (
							'Post Update'
						)}
					</Button>

					<Button
						variant="ghost"
						type="button"
						onClick={handleClearAll}
						disabled={!hasContent() || isSubmitting}
						className="flex cursor-pointer items-center gap-2"
					>
						<X className="size-4" />
						<span className="text-sm font-semibold">Clear all</span>
					</Button>
				</div>
			</div>

			{/* Image Lightbox for full-screen preview */}
			<ImageLightbox
				images={images ?? []}
				currentIndex={previewIndex ?? 0}
				open={previewIndex !== null}
				onOpenChange={open => {
					if (!open) setPreviewIndex(null);
				}}
				onNavigate={setPreviewIndex}
			/>
		</form>
	);
}
