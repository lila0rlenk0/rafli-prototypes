'use client';

import dynamic from 'next/dynamic';
import { useController } from 'react-hook-form';

import { MarkdownSyncPlugin } from '../../lib/markdown-sync-plugin';

import { useUpdateForm } from './update-form-provider';
import type { UpdateFormData } from './schema';

// next/dynamic: lazy-load the Lexical editor — heavy client-only bundle.
// SSR disabled because Lexical requires browser APIs on init.
const Editor = dynamic(
	() =>
		import('@/components/ui/blocks/editor-md/editor').then(module => ({
			default: module.Editor,
		})),
	{
		ssr: false,
		loading: () => <EditorSkeleton />,
	},
);

function EditorSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="text" className="font-medium">
				Description
			</label>
			<div className="h-[185px] w-full animate-pulse rounded-lg bg-gray-50" />
		</div>
	);
}

/**
 * UpdateDescriptionEditor Component
 *
 * Markdown editor for update text, connected to react-hook-form.
 */
export function UpdateDescriptionEditor() {
	const { form } = useUpdateForm();

	const { field, fieldState } = useController<UpdateFormData, 'text'>({
		control: form.control,
		name: 'text',
	});

	/**
	 * Handles markdown changes from the editor
	 * @param markdown - New markdown content
	 */
	function handleMarkdownChange(markdown: string) {
		field.onChange(markdown);
		form.trigger('text');
	}

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="text" className="font-medium">
				Description
			</label>
			<div onBlurCapture={field.onBlur}>
				<Editor
					placeholder="Write your update message..."
					className="border-[#E5E5E5] shadow-none"
					contentClassName="min-h-[140px] px-4 py-3"
					placeholderClassName="text-muted-foreground pointer-events-none absolute top-0 left-0 overflow-hidden px-4 py-3 text-ellipsis select-none"
				>
					<MarkdownSyncPlugin
						markdownValue={field.value || ''}
						onMarkdownChange={handleMarkdownChange}
					/>
				</Editor>
			</div>
			{fieldState.isTouched && fieldState.error ? (
				<span className="text-sm text-red-500">{fieldState.error.message}</span>
			) : null}
		</div>
	);
}
