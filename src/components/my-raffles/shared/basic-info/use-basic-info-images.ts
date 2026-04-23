'use client';

import { useCallback, useRef } from 'react';

interface UseImageHandlersOptions {
	/** Current File[] from the form — never read from state, always from props. */
	current: readonly File[] | undefined;
	/** Max slots. The dropzone also enforces this via `maxFiles`. */
	max: number;
	/** Commit handler — writes the next array into react-hook-form. */
	onChange: (files: File[]) => void;
}

interface UseImageHandlersResult {
	/** Ref to the Dropzone wrapper — used to trigger the hidden file input. */
	dropzoneRef: React.RefObject<HTMLDivElement | null>;
	/** Appends newly-accepted files, clamped to `max` slots. */
	handleDrop: (files: File[]) => void;
	/** Removes the file at `index` from the current array. */
	handleRemove: (index: number) => void;
	/** Imperatively opens the dropzone file picker from empty-slot clicks. */
	handleUploadClick: () => void;
}

/**
 * Consolidates the three imperative concerns around the image grid:
 * drop (append + clamp), remove (splice), and click-to-upload (trigger
 * the hidden file input). Kept out of the composer so both create and
 * edit share the exact same semantics.
 *
 * @returns dropzone ref + three event handlers — no internal state.
 */
export function useBasicInfoImages({
	current,
	max,
	onChange,
}: UseImageHandlersOptions): UseImageHandlersResult {
	// ref — the Dropzone mounts its hidden <input type="file" /> inside its
	// own DOM. Triggering the picker from an empty slot is imperative DOM work,
	// not derivable state, so a ref is the correct escape hatch.
	const dropzoneRef = useRef<HTMLDivElement>(null);

	const handleDrop = useCallback(
		(files: File[]) => {
			// clamp — the Dropzone primitive also enforces `maxFiles`, but the
			// composer owns the authoritative state, so we slice defensively.
			const next = [...(current ?? []), ...files].slice(0, max);
			onChange(next);
		},
		[current, max, onChange],
	);

	const handleRemove = useCallback(
		(index: number) => {
			if (!current) return;
			onChange(current.filter((_, i) => i !== index));
		},
		[current, onChange],
	);

	const handleUploadClick = useCallback(() => {
		const input = dropzoneRef.current?.querySelector('input[type="file"]');
		if (input) (input as HTMLInputElement).click();
	}, []);

	return { dropzoneRef, handleDrop, handleRemove, handleUploadClick };
}
