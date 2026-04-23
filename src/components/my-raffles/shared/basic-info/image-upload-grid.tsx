'use client';

import type { RefObject } from 'react';
import { useMemo, useState } from 'react';

import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from '@/components/ui/dropzone';
import { ImageLightbox } from '@/components/ui-custom/image-lightbox';
import { ImagePreviewCard } from '@/components/ui-custom/image-preview-card';

/** Max image slots — 1 cover + 3 gallery. Kept in sync with the Dropzone `maxFiles`. */
const MAX_SLOTS = 4;

/** 5 MB — mirrored from both create + edit form schemas; Dropzone rejects oversize files. */
const IMAGE_ACCEPT = {
	'image/png': ['.png'],
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/webp': ['.webp'],
} as const;

/**
 * Restriction flags. Edit wizard locks removal of existing (already-published)
 * images — only newly-attached File objects can be deleted. Create wizard
 * has no such restriction and the default is fully unlocked.
 */
interface ImageUploadRestrictions {
	/**
	 * When `true`, the remove button is hidden for slots that contain an
	 * existing image URL (i.e. only new `File` uploads can be removed).
	 */
	lockExistingRemoval?: boolean;
}

interface ImageUploadGridProps {
	/** Ref on the dropzone wrapper — used by `useBasicInfoImages` for click-to-upload. */
	dropzoneRef: RefObject<HTMLDivElement | null>;
	/** Current File[] — shown in the slots, and passed into the Dropzone `src`. */
	coverImage: readonly File[] | undefined;
	/** Max file size in bytes — sourced from the form schema's `MAX_FILE_SIZE`. */
	maxFileSize: number;
	/** Append handler — the hook clamps to `MAX_SLOTS` before writing. */
	onDrop: (files: File[]) => void;
	/** Remove handler at a given index. */
	onRemove: (index: number) => void;
	/** Click-to-upload for empty slots — triggers the hidden file input. */
	onUploadClick: () => void;
	/** Error message for the `coverImage` field, or `undefined` when valid. */
	error: string | undefined;
	/** Whether the field was touched — gates error rendering. */
	touched: boolean | undefined;
	/**
	 * Optional lookup for slot `index` that returns an existing URL already
	 * stored on the backend (edit wizard only). Returns `null` when no
	 * existing image covers that slot.
	 */
	getExistingSource?: (index: number) => string | null;
	/** Restrictions — defaults to fully-unlocked. */
	restrictions?: ImageUploadRestrictions;
}

/**
 * Dropzone + 4-slot preview grid + fullscreen lightbox.
 *
 * Slots prioritize newly-uploaded File objects over existing URLs at the same
 * index (edit wizard). The lightbox iterates the same resolution order so the
 * preview matches what the grid shows.
 *
 * @returns Image uploader block with grid, error, and lightbox overlay.
 */
export function ImageUploadGrid({
	dropzoneRef,
	coverImage,
	maxFileSize,
	onDrop,
	onRemove,
	onUploadClick,
	error,
	touched,
	getExistingSource,
	restrictions,
}: ImageUploadGridProps) {
	// state — lightbox index; `null` means closed. Simpler than a boolean +
	// index pair because "open" and "which image" are not independent here.
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);

	const lockExistingRemoval = restrictions?.lockExistingRemoval ?? false;

	// useMemo — resolves each slot once per render to the same source the
	// lightbox displays. File wins over existing URL (upload in progress
	// visually replaces the remote image). Depends on both inputs.
	const sources = useMemo<Array<File | string | null>>(
		() =>
			Array.from({ length: MAX_SLOTS }, (_, index) => {
				const file = coverImage?.[index];
				if (file) return file;
				return getExistingSource?.(index) ?? null;
			}),
		[coverImage, getExistingSource],
	);

	function handlePreview(index: number) {
		setPreviewIndex(index);
	}

	return (
		<div className="flex flex-col gap-2" ref={dropzoneRef}>
			<label htmlFor="coverImage" className="font-medium">
				Images
			</label>
			<p className="text-sm text-neutral-500">
				The first image will be used as the cover of your raffle card and
				details page. Images will be displayed in the carousel in the same order
				they appear here.
			</p>
			<Dropzone
				src={coverImage ? [...coverImage] : undefined}
				accept={IMAGE_ACCEPT}
				maxSize={maxFileSize}
				maxFiles={MAX_SLOTS}
				hint="Recommended: 1200×675px (16:9). Keep the subject centered."
				onDrop={onDrop}
				className="border-ink-200 w-full rounded-lg bg-white hover:bg-white"
			>
				<DropzoneEmptyState />
				<DropzoneContent />
			</Dropzone>
			{touched && error ? (
				<span className="text-sm text-red-500">{error}</span>
			) : null}

			<div className="grid grid-cols-4 gap-4">
				{sources.map((src, index) => {
					// a new File at this index means the user just added it —
					// always removable. When `lockExistingRemoval` is on, an
					// existing URL (string src with no File) stays non-removable.
					const hasNewFile = Boolean(coverImage?.[index]);
					const canRemove = lockExistingRemoval ? hasNewFile : Boolean(src);

					return (
						<ImagePreviewCard
							key={index}
							src={src}
							alt={`Preview ${index + 1}`}
							index={index}
							onRemove={canRemove ? onRemove : undefined}
							onPreview={src ? handlePreview : undefined}
							onUpload={src ? undefined : onUploadClick}
						/>
					);
				})}
			</div>

			<ImageLightbox
				images={sources}
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
