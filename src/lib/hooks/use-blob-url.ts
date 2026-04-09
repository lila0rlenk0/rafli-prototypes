'use client';

import { useEffect, useState } from 'react';

interface BlobUrlState {
	file: File | null | undefined;
	url: string | null;
}

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
	const [blobUrlState, setBlobUrlState] = useState<BlobUrlState>({
		file: null,
		url: null,
	});

	// Sync target: File object → browser blob URL. Deps: [file] — new File means
	// new blob URL needed. Cleanup: revokes the previous blob URL to free memory.
	// Blob URLs are browser-managed resources, so the effect owns allocation +
	// revocation. The state keeps the source File alongside the URL so render can
	// ignore stale URLs while a replacement is still being created.
	useEffect(() => {
		if (!file) return;

		const url = URL.createObjectURL(file);
		let isCurrent = true;

		// Defer the React state update out of the effect body. This keeps the
		// effect focused on external resource sync while still publishing the
		// ready-to-render URL immediately after commit.
		queueMicrotask(() => {
			if (!isCurrent) return;

			setBlobUrlState({
				file,
				url,
			});
		});

		return () => {
			isCurrent = false;
			URL.revokeObjectURL(url);
		};
	}, [file]);

	// Only expose the URL when it belongs to the current File. This prevents a
	// just-revoked previous URL from flashing during file swaps.
	return blobUrlState.file === file ? blobUrlState.url : null;
}
