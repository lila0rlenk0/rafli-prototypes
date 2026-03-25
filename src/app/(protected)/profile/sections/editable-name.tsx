'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateMe } from '@/services/user/update-me';
import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Props for the EditableName component
 */
interface EditableNameProps {
	/**
	 * The current user name
	 */
	name: string;
}

/**
 * Matches backend constraint — sanitizeText + max 100 chars
 */
const NAME_MAX_LENGTH = 100;

/**
 * EditableName Component
 *
 * Displays the user's full name with inline editing capability.
 * On click of pencil icon, switches to an input field for editing.
 *
 * @returns Inline-editable name field with save/cancel controls
 */
export function EditableName({ name }: EditableNameProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [nameValue, setNameValue] = useState(name);
	const [isUpdating, setIsUpdating] = useState(false);

	/**
	 * Enters edit mode, resetting input to current server value
	 */
	function handleEditClick() {
		setNameValue(name);
		setIsEditing(true);
	}

	function handleCancelClick() {
		if (isUpdating) return;
		setIsEditing(false);
		setNameValue(name);
	}

	async function handleSaveClick() {
		if (isUpdating) return;

		const trimmed = nameValue.trim();

		// Backend requires min 1 char
		if (trimmed.length === 0) {
			toast.error('Name cannot be empty');
			return;
		}

		if (trimmed.length > NAME_MAX_LENGTH) {
			toast.error(`Name must be ${NAME_MAX_LENGTH} characters or less`);
			return;
		}

		// Skip API call if nothing changed
		if (trimmed === name) {
			setIsEditing(false);
			return;
		}

		setIsUpdating(true);

		try {
			const result = await updateMe({ name: trimmed });

			if (!result.success) {
				toast.error('Failed to update name. Please try again.');
				return;
			}

			toast.success('Name updated successfully!');

			// updateMe already revalidates profile cache internally
			setIsEditing(false);
		} catch (error) {
			console.error('Unexpected error during name update:', error);
			toast.error('An unexpected error occurred. Please try again.');
		} finally {
			setIsUpdating(false);
		}
	}

	function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
		setNameValue(event.target.value);
	}

	/**
	 * Saves on Enter, cancels on Escape — standard inline-edit UX
	 */
	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			handleSaveClick();
		} else if (event.key === 'Escape') {
			handleCancelClick();
		}
	}

	/**
	 * Pre-compute trimmed length to avoid repeated .trim() calls in JSX
	 */
	const trimmedLength = nameValue.trim().length;

	if (isEditing) {
		return (
			<div className="flex flex-col gap-1">
				<span className="text-sm">Full Name</span>
				<div className="flex items-center gap-1">
					<Input
						value={nameValue}
						onChange={handleNameChange}
						onKeyDown={handleKeyDown}
						maxLength={NAME_MAX_LENGTH}
						disabled={isUpdating}
						className="text-lg font-semibold"
						autoFocus
					/>
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
							disabled={
								isUpdating ||
								trimmedLength === 0 ||
								trimmedLength > NAME_MAX_LENGTH
							}
							aria-label="Save name"
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
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<span className="text-sm">Full Name</span>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={handleEditClick}
					aria-label="Edit name"
				>
					<Pencil className="size-4" />
				</Button>
			</div>
			<span className="truncate text-lg font-semibold">{name}</span>
		</div>
	);
}
