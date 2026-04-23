'use client';

import dynamic from 'next/dynamic';
import { useController, type Control } from 'react-hook-form';

import { MarkdownSyncPlugin } from '@/lib/editor/markdown-sync-plugin';

import type { RaffleFormData } from '@/lib/validation/raffle/create-form-schema';

type DescriptionEditorProps = {
	control: Control<RaffleFormData>;
	name?: 'description';
	trigger?: (name: 'description') => Promise<boolean>;
};

// next/dynamic: lazy-load the Lexical editor — it's a heavy client-only bundle
// (~50kB gzipped). SSR disabled because Lexical requires browser APIs on init.
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
			<label htmlFor="description" className="font-medium">
				Description
			</label>
			<div className="h-46.25 w-full animate-pulse rounded-lg bg-gray-50" />
		</div>
	);
}

export function DescriptionEditor({
	control,
	name = 'description',
	trigger,
}: DescriptionEditorProps) {
	const { field, fieldState } = useController({
		control,
		name,
	});

	/**
	 * Handles markdown changes from the editor and triggers validation
	 * @param markdown - New markdown content
	 */
	function handleMarkdownChange(markdown: string) {
		field.onChange(markdown);
		// Trigger validation after change
		if (trigger) {
			trigger(name);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="description" className="font-medium">
				Description
			</label>
			<div onBlurCapture={field.onBlur}>
				<Editor
					placeholder="Enter sweepstakes description"
					className="border-ink-200 shadow-none"
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
