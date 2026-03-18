'use client';

import { PublishSplitButton } from '@/components/raffle/publish-split-button';

import { useEditForm } from './edit-form-provider';

/**
 * Publish split button wired to the edit form context.
 * Delegates rendering to the shared PublishSplitButton component.
 */
export function PublishRaffleButton() {
	const { isPublishing, handlePublish } = useEditForm();

	return (
		<PublishSplitButton isPublishing={isPublishing} onPublish={handlePublish} />
	);
}
