'use client';

import { useMemo } from 'react';

import { Combobox } from '@/components/ui/combobox';
import type { Category } from '@/types/category';

interface CategoryComboboxFieldProps {
	/** Full category list — comes from server props, rarely changes. */
	categories: readonly Category[];
	/** Currently selected category id (backend UUID), or empty string. */
	value: string | undefined;
	/** Write-through to the form — `shouldValidate: true` on the caller side. */
	onValueChange: (value: string) => void;
	/** Error message for the `category` field, or `undefined` when valid. */
	error: string | undefined;
	/** Whether the field was touched — gates error rendering. */
	touched: boolean | undefined;
}

/**
 * Category selector backed by the `Combobox` primitive.
 *
 * @returns Labelled combobox with inline error rendering.
 */
export function CategoryComboboxField({
	categories,
	value,
	onValueChange,
	error,
	touched,
}: CategoryComboboxFieldProps) {
	// useMemo — the combobox re-filters on every input keystroke, so giving it
	// a stable array reference prevents needless reconciliations in the
	// Command list. Depend on `categories` only — server-supplied, changes rarely.
	const categoryOptions = useMemo(
		() =>
			categories.map(cat => ({
				value: cat.id,
				label: cat.name,
			})),
		[categories],
	);

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="category" className="font-medium">
				Category
			</label>
			<Combobox
				options={categoryOptions}
				value={value}
				onValueChange={onValueChange}
				placeholder="Select category"
				searchPlaceholder="Search category..."
				emptyText="No category found."
			/>
			{touched && error ? (
				<span className="text-sm text-red-500">{error}</span>
			) : null}
		</div>
	);
}
