'use client';

import { useMemo } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { generateSlugPreview } from '@/lib/utils/format/slug-preview';

interface TitleSlugFieldProps {
	/** Output of `register('title')` — preserves the exact RHF registration. */
	register: UseFormRegisterReturn;
	/** Watched title value — source of truth for the slug preview. */
	title: string | undefined;
	/** Error message for the `title` field, or `undefined` when valid. */
	error: string | undefined;
	/** Whether the field was touched — gates error rendering. */
	touched: boolean | undefined;
	/**
	 * Show the live slug preview under the input. Create wizard shows it,
	 * edit wizard does not (slug is immutable post-creation).
	 */
	showSlugPreview?: boolean;
}

/**
 * Title input + optional live slug preview.
 *
 * The slug preview is deterministic (see `generateSlugPreview`) so the
 * displayed path stays stable while typing. The final backend slug may
 * differ — the copy below makes this explicit.
 *
 * @returns Titled `<Input>` with error + optional `/browse/<slug>` hint.
 */
export function TitleSlugField({
	register,
	title,
	error,
	touched,
	showSlugPreview = false,
}: TitleSlugFieldProps) {
	// useMemo — slugify normalizes accents and runs a DJB2 hash. Recomputing
	// on every keystroke of an unrelated field (description, price) is pure
	// waste. Depend on `title` only.
	const previewSlugPath = useMemo(() => {
		if (!showSlugPreview) return null;
		if (!title || title.trim().length === 0) return null;

		return `/browse/${generateSlugPreview(title)}`;
	}, [title, showSlugPreview]);

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="title" className="font-medium">
				Raffle title
			</label>
			<Input
				id="title"
				type="text"
				placeholder="Smart Watch"
				className="border-ink-200"
				aria-invalid={!!error}
				aria-describedby={error ? 'title-error' : undefined}
				{...register}
			/>
			{touched && error ? (
				<span className="text-sm text-red-500">{error}</span>
			) : null}
			{showSlugPreview ? (
				<p className="text-muted-foreground min-h-5 text-sm">
					{previewSlugPath
						? `Slug preview: ${previewSlugPath} (final URL may differ)`
						: null}
				</p>
			) : null}
		</div>
	);
}
