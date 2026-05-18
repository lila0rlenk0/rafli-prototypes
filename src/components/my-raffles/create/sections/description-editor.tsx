'use client';

import dynamic from 'next/dynamic';
import {
	useController,
	type Control,
	type FieldValues,
	type Path,
} from 'react-hook-form';

import { MarkdownSyncPlugin } from '@/lib/editor/markdown-sync-plugin';

/**
 * Generic over the host form so create + edit wizards (which now have
 * structurally different schemas after the advanced-settings additions)
 * can both bind their `description` field. RHF's `Control<T>` is
 * invariant on its type parameter, which is why a previously-untyped
 * `Control<RaffleFormData>` here would refuse a `Control<EditFormData>`.
 *
 * `name` is required — callers pass it explicitly so the path is checked
 * against `TForm`, rather than being defaulted to a literal that may not
 * exist on every host schema.
 */
type DescriptionEditorProps<TForm extends FieldValues> = {
	control: Control<TForm>;
	name: Path<TForm>;
	trigger?: (name: Path<TForm>) => Promise<boolean>;
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

export function DescriptionEditor<TForm extends FieldValues>({
	control,
	name,
	trigger,
}: DescriptionEditorProps<TForm>) {
	const { field, fieldState } = useController<TForm>({
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
						markdownValue={typeof field.value === 'string' ? field.value : ''}
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
