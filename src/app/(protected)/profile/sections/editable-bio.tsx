'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { revalidateProfile } from '@/services/user/revalidate-profile';
import { updateMe } from '@/services/user/update-me';
import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Props for the EditableBio component
 */
interface EditableBioProps {
	/**
	 * The current bio text
	 */
	bio?: string | null;
}

/**
 * Maximum character limit for bio
 */
const BIO_MAX_LENGTH = 500;

/**
 * EditableBio Component
 *
 * Displays a user bio with inline editing capability.
 * Shows a placeholder text when no bio is available.
 * On click of pencil icon, switches to edit mode with a textarea.
 *
 * @param bio - Optional current bio text
 */
export function EditableBio({ bio }: EditableBioProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [bioValue, setBioValue] = useState(bio ?? '');
	const [isUpdating, setIsUpdating] = useState(false);

	/**
	 * Handles entering edit mode
	 */
	function handleEditClick() {
		setBioValue(bio ?? '');
		setIsEditing(true);
	}

	/**
	 * Handles cancelling edit mode
	 */
	function handleCancelClick() {
		if (isUpdating) return;
		setIsEditing(false);
		setBioValue(bio ?? '');
	}

	/**
	 * Handles saving the bio
	 */
	async function handleSaveClick() {
		if (isUpdating) return;

		// Validate length
		if (bioValue.length > BIO_MAX_LENGTH) {
			toast.error(`Bio must be ${BIO_MAX_LENGTH} characters or less`);
			return;
		}

		setIsUpdating(true);

		try {
			const result = await updateMe({ bio: bioValue });

			if (!result.success) {
				toast.error('Failed to update bio. Please try again.');
				return;
			}

			toast.success('Bio updated successfully!');

			// Revalidate profile cache
			await revalidateProfile();

			setIsEditing(false);
		} catch (error) {
			console.error('Unexpected error during bio update:', error);
			toast.error('An unexpected error occurred. Please try again.');
		} finally {
			setIsUpdating(false);
		}
	}

	/**
	 * Handles textarea value change
	 */
	function handleBioChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
		setBioValue(event.target.value);
	}

	if (isEditing) {
		return (
			<div className="flex items-start gap-[22px]">
				<div className="flex min-w-0 flex-1 flex-col gap-2 md:max-w-[778px]">
					<span className="text-sm leading-relaxed text-[#7B7B7B]">Bio</span>
					<div className="relative">
						<Textarea
							value={bioValue}
							onChange={handleBioChange}
							maxLength={BIO_MAX_LENGTH}
							rows={4}
							placeholder="Tell us about yourself..."
							disabled={isUpdating}
							className="resize-y pr-12 pb-6"
						/>
						<span className="text-muted-foreground absolute right-3 bottom-2 text-sm">
							{bioValue.length}/{BIO_MAX_LENGTH}
						</span>
					</div>
					<div className="flex gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleCancelClick}
							disabled={isUpdating}
							aria-label="Cancel editing"
						>
							<X className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleSaveClick}
							disabled={isUpdating || bioValue.length > BIO_MAX_LENGTH}
							aria-label="Save bio"
						>
							{isUpdating ? (
								<div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								<Check className="size-4" />
							)}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-[22px]">
			<div className="flex min-w-0 flex-1 flex-col gap-2 md:max-w-[778px]">
				<span className="text-sm leading-relaxed text-[#7B7B7B]">Bio</span>
				<span
					data-bio={!!bio}
					className="data-[bio=false]:text-muted-foreground text-base font-medium text-black/95"
				>
					{bio ? bio : 'No bio.'}
				</span>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleEditClick}
				aria-label="Edit bio"
			>
				<Pencil className="size-6" />
			</Button>
		</div>
	);
}
