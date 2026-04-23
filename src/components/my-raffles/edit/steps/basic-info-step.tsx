'use client';

import { DollarSign, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DescriptionEditor } from '@/components/my-raffles/create/sections/description-editor';
import { CategoryComboboxField } from '@/components/my-raffles/shared/basic-info/category-combobox-field';
import { ImageUploadGrid } from '@/components/my-raffles/shared/basic-info/image-upload-grid';
import { TitleSlugField } from '@/components/my-raffles/shared/basic-info/title-slug-field';
import { useBasicInfoImages } from '@/components/my-raffles/shared/basic-info/use-basic-info-images';
import { MAX_FILE_SIZE } from '@/lib/validation/raffle/edit-form-schema';

import { useEditForm } from '../form-provider';
import { STEPS } from '.';

/** Fields on this step that block `nextStep()` when invalid. */
const STEP_FIELDS = ['title', 'description', 'price', 'category'] as const;

/** Minimum declared value — matches the edit Zod schema. */
const MIN_DECLARED_VALUE = 0.5;

/**
 * Step 1 of the raffle edit wizard — title, description, declared value,
 * category, and cover/gallery images. Displays existing images (already
 * stored on the backend) alongside any newly-uploaded files.
 *
 * Existing images cannot be removed from the wizard — edit-wizard policy
 * enforced via `ImageUploadGrid` restrictions.
 *
 * @returns Form fields for the edit basic info step with continue/clear actions.
 */
export function BasicInfoStep() {
	const {
		form,
		currentStep: stepIndex,
		nextStep,
		existingCoverUrl,
		existingGalleryUrls,
		categories,
	} = useEditForm();
	const {
		register,
		formState: { errors, touchedFields },
		watch,
		setValue,
		getValues,
		trigger,
	} = form;

	const currentStep = STEPS[stepIndex];

	const title = watch('title');
	const description = watch('description');
	const price = watch('price');
	const category = watch('category');
	const coverImage = watch('coverImage');

	const { dropzoneRef, handleDrop, handleRemove, handleUploadClick } =
		useBasicInfoImages({
			current: coverImage,
			max: 4,
			onChange: files => setValue('coverImage', files),
		});

	const hasFilledFields = Boolean(
		title ||
		description ||
		(price && price >= MIN_DECLARED_VALUE) ||
		category ||
		(coverImage && coverImage.length > 0),
	);

	/**
	 * Resolves the already-stored backend image URL for a given slot.
	 * Slot 0 is the cover; slots 1–3 map into the gallery in order.
	 */
	function getExistingSource(index: number): string | null {
		if (index === 0) return existingCoverUrl;
		return existingGalleryUrls[index - 1] ?? null;
	}

	function handleClearAll() {
		setValue('title', '');
		setValue('description', '');
		// NaN — see `create/steps/basic-info-step.tsx` for rationale.
		setValue('price', NaN);
		setValue('category', '');
		setValue('coverImage', []);
	}

	async function handleContinue() {
		const isValid = await trigger([...STEP_FIELDS]);
		if (!isValid) {
			for (const field of STEP_FIELDS) {
				setValue(field, getValues(field), { shouldTouch: true });
			}
			requestAnimationFrame(() => {
				const firstError = document.querySelector('.text-red-500');
				firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
			return;
		}
		nextStep();
	}

	return (
		<div className="flex w-full flex-col gap-6 rounded-2xl bg-white p-6">
			<h2 className="mb-6 text-xl font-semibold">{currentStep.title}</h2>

			<ImageUploadGrid
				dropzoneRef={dropzoneRef}
				coverImage={coverImage}
				maxFileSize={MAX_FILE_SIZE}
				onDrop={handleDrop}
				onRemove={handleRemove}
				onUploadClick={handleUploadClick}
				error={errors.coverImage?.message}
				touched={Boolean(touchedFields.coverImage)}
				getExistingSource={getExistingSource}
				restrictions={{ lockExistingRemoval: true }}
			/>

			<TitleSlugField
				register={register('title')}
				title={title}
				error={errors.title?.message}
				touched={touchedFields.title}
			/>

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
							className="border-ink-200 pl-9"
							placeholder="0.50"
							{...register('price', { valueAsNumber: true })}
						/>
					</div>
					{touchedFields.price && errors.price ? (
						<span className="text-sm text-red-500">{errors.price.message}</span>
					) : null}
				</div>
				<CategoryComboboxField
					categories={categories}
					value={category}
					onValueChange={value =>
						setValue('category', value, { shouldValidate: true })
					}
					error={errors.category?.message}
					touched={touchedFields.category}
				/>
			</div>

			<div className="flex items-center gap-2">
				<Button
					type="button"
					onClick={handleContinue}
					className="cursor-pointer"
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
		</div>
	);
}
