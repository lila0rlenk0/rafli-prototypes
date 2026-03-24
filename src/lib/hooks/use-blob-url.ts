'use client';

import { useEffect, useState } from 'react';

/**
 * Manages a browser blob URL lifecycle for a File object.
 *
 * Creates a blob URL via `URL.createObjectURL` when a File is provided,
 * and revokes it on cleanup (unmount or file change) to prevent memory leaks.
 *
 * @param file - File to create a blob URL for, or null/undefined
 * @returns Blob URL string when file is present, null otherwise
 */
export function useBlobUrl(file: File | null | undefined): string | null {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);

	/* eslint-disable react-hooks/set-state-in-effect -- blob URL API is external system sync:
	   createObjectURL allocates a browser-managed resource that must be stored in state for
	   rendering and revoked on cleanup. No alternative avoids setState here. */
	useEffect(() => {
		if (!file) return;

		const url = URL.createObjectURL(file);
		setBlobUrl(url);

		return () => {
			URL.revokeObjectURL(url);
		};
	}, [file]);
	/* eslint-enable react-hooks/set-state-in-effect */

	// When file is absent, derive null directly instead of relying on stale state
	return file ? blobUrl : null;
}
