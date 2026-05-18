'use client';

import { DollarSign, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_FILE_SIZE } from '@/lib/validation/raffle/create-form-schema';

import { DescriptionEditor } from '@/components/my-raffles/create/sections/description-editor';
import { useMultiStepForm } from '@/components/my-raffles/create/multi-step-form-provider';
import { STEPS } from '.';
import { CategoryComboboxField } from '@/components/my-raffles/shared/basic-info/category-combobox-field';
import { ImageUploadGrid } from '@/components/my-raffles/shared/basic-info/image-upload-grid';
import { TitleSlugField } from '@/components/my-raffles/shared/basic-info/title-slug-field';
import { useBasicInfoImages } from '@/components/my-raffles/shared/basic-info/use-basic-info-images';

/** Fields on this step that block `nextStep()` when invalid. */
const STEP_FIELDS = ['title', 'description', 'price', 'category'] as const;

/** Minimum declared value — matches the Zod schema. */
const MIN_DECLARED_VALUE = 0.5;

/**
 * Step 1 of the raffle creation wizard — collects title, description,
 * declared value, category, and cover/gallery images.
 *
 * @returns Form fields for the basic info step with continue/clear actions.
 */
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
		getValues,
		trigger,
	} = form;

	const currentStep = STEPS[stepIndex];

	// watch the exact fields this step owns — narrower subscriptions keep
	// re-renders scoped to this step and avoid firing on every keystroke of
	// step 2 or 3.
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

	// enables the "Clear all" button only when at least one step field has
	// meaningful content — avoids a useless click on a fresh step.
	const hasFilledFields = Boolean(
		title ||
		description ||
		(price && price >= MIN_DECLARED_VALUE) ||
		category ||
		(coverImage && coverImage.length > 0),
	);

	function handleClearAll() {
		setValue('title', '');
		setValue('description', '');
		// NaN — the Zod schema transforms NaN into 0 then fails the min check,
		// so leaving NaN here is the canonical "empty" state for a numeric field.
		setValue('price', NaN);
		setValue('category', '');
		setValue('coverImage', []);
	}

	async function handleContinue() {
		const isValid = await trigger([...STEP_FIELDS]);
		if (!isValid) {
			// touch each field so inline errors render — otherwise the user sees
			// no feedback on a freshly-blurred-but-never-touched field.
			for (const field of STEP_FIELDS) {
				setValue(field, getValues(field), { shouldTouch: true });
			}
			// rAF — wait for the error DOM nodes to mount before scrolling.
			requestAnimationFrame(() => {
				const firstError = document.querySelector('.text-red-500');
				firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
			return;
		}
		nextStep();
	}

	return (
		<div className="flex w-full flex-col gap-8 rounded-2xl bg-white p-8">
			<h2 className="text-xl font-semibold">{currentStep.title}</h2>

			<ImageUploadGrid
				dropzoneRef={dropzoneRef}
				coverImage={coverImage}
				maxFileSize={MAX_FILE_SIZE}
				onDrop={handleDrop}
				onRemove={handleRemove}
				onUploadClick={handleUploadClick}
				error={errors.coverImage?.message}
				touched={Boolean(touchedFields.coverImage)}
			/>

			<TitleSlugField
				register={register('title')}
				title={title}
				error={errors.title?.message}
				touched={touchedFields.title}
				showSlugPreview
			/>

			<DescriptionEditor
				control={form.control}
				name="description"
				trigger={trigger}
			/>

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
					className="cursor-pointer px-6"
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
