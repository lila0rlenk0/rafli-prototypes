'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { STEPS } from '.';
import { useMultiStepForm } from '../multi-step-form-provider';

export function BasicInfoStep() {
	const { form, currentStep: stepIndex, nextStep } = useMultiStepForm();
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

	// Check if any field in this step is filled
	const hasFilledFields = Boolean(
		title || description || (price && price > 0) || category,
	);

	// Check if all fields in this step are filled and valid
	const isCurrentStepValid =
		Boolean(title) &&
		Boolean(description) &&
		Boolean(price && price > 0) &&
		Boolean(category) &&
		!errors.title &&
		!errors.description &&
		!errors.price &&
		!errors.category;

	// Clear only this step's fields
	const handleClearAll = () => {
		setValue('title', '');
		setValue('description', '');
		setValue('price', 0);
		setValue('category', '');
	};

	// Handle continue with validation
	const handleContinue = async () => {
		// Trigger validation for current step fields
		const isValid = await trigger(['title', 'description', 'price', 'category']);

		if (isValid) {
			nextStep();
		}
	};

	return (
		<div className="flex w-full flex-col gap-6 rounded-2xl bg-white p-6">
			<h2 className="mb-6 text-xl font-semibold">{currentStep.title}</h2>

			<div className="flex flex-col gap-2">
				<label htmlFor="title" className="font-medium">
					Raffle title
				</label>
				<Input
					id="title"
					type="text"
					placeholder="Enter raffle title"
					className="border-[#E5E5E5]"
					aria-invalid={!!errors.title}
					aria-describedby={errors.title ? 'title-error' : undefined}
					{...register('title')}
				/>
				{touchedFields.title && errors.title && (
					<span className="text-sm text-red-500">{errors.title.message}</span>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="description" className="font-medium">
					Description
				</label>
				<Textarea
					id="description"
					rows={5}
					placeholder="Enter raffle description"
					{...register('description')}
				/>
				{touchedFields.description && errors.description && (
					<span className="text-sm text-red-500">
						{errors.description.message}
					</span>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2">
					<label htmlFor="price" className="font-medium">
						Declared value
					</label>
					<Input
						id="price"
						type="number"
						step="0.01"
						className="border-[#E5E5E5]"
						placeholder="0.00"
						{...register('price', { valueAsNumber: true })}
					/>
					{touchedFields.price && errors.price && (
						<span className="text-sm text-red-500">{errors.price.message}</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label htmlFor="category" className="font-medium">
						Category
					</label>
					<Input
						id="category"
						className="border-[#E5E5E5]"
						placeholder="Device"
						{...register('category')}
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
					className="cursor-pointer disabled:bg-black disabled:opacity-100"
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
