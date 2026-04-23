'use client';

import { revalidateProfile } from '@/services/user/revalidate-profile';
import { uploadAvatar } from '@/services/user/upload-avatar';
import { CLIENT_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { Pencil } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';

/**
 * Props for the EditableAvatar component
 */
interface EditableAvatarProps {
	/**
	 * The current avatar image URL
	 */
	avatarUrl?: string | null;
	/**
	 * User initials to display when no avatar is available
	 */
	initials: string;
	/**
	 * Size of the avatar in pixels
	 * @default 85
	 */
	size?: number;
}

/**
 * EditableAvatar Component
 *
 * Displays a user avatar with the ability to upload a new image.
 * Shows a placeholder with user initials when no avatar image is available.
 * On hover, displays an overlay with a pencil icon indicating the avatar can be edited.
 *
 * @param avatarUrl - Optional current avatar image URL
 * @param initials - User initials to display as fallback
 * @param size - Size of the avatar in pixels (default: 85)
 */
export function EditableAvatar({
	avatarUrl,
	initials,
	size = 120,
}: EditableAvatarProps) {
	// Ref instead of state — direct DOM access to trigger the hidden file input.
	// No re-render needed when the ref is set.
	const fileInputRef = useRef<HTMLInputElement>(null);
	// Tracks mouse hover for the edit overlay — purely visual, no side effects
	const [isHovered, setIsHovered] = useState(false);
	// Tracks in-flight upload to show spinner and disable interaction
	const [isUploading, setIsUploading] = useState(false);

	/**
	 * Maps error codes to user-friendly messages
	 *
	 * @param errorCode - The error code from the upload response
	 * @returns User-friendly error message
	 */
	function getErrorMessage(errorCode: RaffleErrorCode | string): string {
		switch (errorCode) {
			case CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE:
				return 'Only PNG, JPEG and WebP images are accepted';
			case CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE:
				return 'File size must be less than 5MB';
			case 'network_error':
				return 'Network error. Please check your connection';
			case 'timeout_error':
				return 'Request timed out. Please try again';
			default:
				return 'Failed to upload avatar. Please try again';
		}
	}

	/**
	 * Handles file input change event
	 *
	 * Validates the selected file and triggers the upload process.
	 *
	 * @param event - The file input change event
	 */
	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsUploading(true);

		try {
			const result = await uploadAvatar(file);

			if (!result.success) {
				const message = getErrorMessage(result.error);
				toast.error(message);
				return;
			}

			toast.success('Avatar updated successfully!');

			// Invalidate /me endpoint cache to force fresh data fetch
			await revalidateProfile();

			window.location.reload();
		} catch (error) {
			console.error('Unexpected error during avatar upload:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			setIsUploading(false);
			// Reset file input to allow selecting the same file again
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	}

	/**
	 * Handles click on avatar to trigger file selection
	 */
	function handleAvatarClick() {
		if (isUploading) return;
		fileInputRef.current?.click();
	}

	function handleMouseEnter() {
		setIsHovered(true);
	}

	function handleMouseLeave() {
		setIsHovered(false);
	}

	// Avatar size is a prop — Tailwind can't emit a static utility for a
	// runtime number, so route the dimensions through a variable-bound
	// style object to satisfy `local/no-inline-style`.
	const wrapperStyle: CSSProperties = { width: size, height: size };

	return (
		<div
			className="relative cursor-pointer overflow-hidden rounded-full transition-all duration-300"
			style={wrapperStyle}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleAvatarClick}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				onChange={handleFileChange}
				className="hidden"
				disabled={isUploading}
			/>
			{avatarUrl ? (
				<Image
					key={avatarUrl}
					src={avatarUrl}
					alt="Profile avatar"
					fill
					sizes="85px"
					className="object-cover transition-all duration-300"
					unoptimized
				/>
			) : (
				<div className="flex size-full items-center justify-center rounded-full bg-gray-200 transition-all duration-300">
					<span className="text-2xl font-semibold">{initials}</span>
				</div>
			)}
			{/* Overlay with pencil icon on hover */}
			{!isUploading ? (
				<div
					className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/40 transition-opacity duration-300 ${
						isHovered ? 'opacity-100' : 'pointer-events-none opacity-0'
					}`}
				>
					<Pencil className="size-5 text-white" />
				</div>
			) : null}
			{/* Loading overlay */}
			{isUploading ? (
				<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 transition-opacity duration-300">
					<div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
				</div>
			) : null}
		</div>
	);
}
