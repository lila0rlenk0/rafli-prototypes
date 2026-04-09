'use client';

import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	CHECK_LIST,
	ELEMENT_TRANSFORMERS,
	MULTILINE_ELEMENT_TRANSFORMERS,
	TEXT_FORMAT_TRANSFORMERS,
	TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';
import { CodeNode } from '@lexical/code';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $getRoot } from 'lexical';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useController, type Control } from 'react-hook-form';

import type { RaffleFormData } from './schema';

type DescriptionEditorProps = {
	control: Control<RaffleFormData>;
	name?: 'description';
	trigger?: (name: 'description') => Promise<boolean>;
};

// Helper function to check if transformer depends on CodeNode
function hasCodeNodeDependency(transformer: {
	dependencies?: unknown[];
	regExp?: RegExp;
}): boolean {
	// Check dependencies array
	if (transformer.dependencies && transformer.dependencies.length > 0) {
		const hasCodeNode = transformer.dependencies.some(
			dep => dep === CodeNode || dep === 'CodeNode',
		);
		if (hasCodeNode) {
			return true;
		}
		// Also check by name as fallback
		const depNames = transformer.dependencies.map(dep => {
			if (typeof dep === 'function') {
				return dep.name || dep.constructor?.name;
			}
			return String(dep);
		});
		if (
			depNames.some(
				name =>
					name &&
					(name.includes('CodeNode') ||
						(name.includes('Code') && !name.includes('CodeHighlight'))),
			)
		) {
			return true;
		}
	}
	// Check regex pattern for code blocks
	if ('regExp' in transformer && transformer.regExp) {
		const regexStr = transformer.regExp.toString();
		if (
			regexStr.includes('```') ||
			(regexStr.includes('`') && regexStr.includes('code'))
		) {
			return true;
		}
	}
	return false;
}

// Same transformers used in the editor plugins
const MARKDOWN_TRANSFORMERS = [
	CHECK_LIST,
	...ELEMENT_TRANSFORMERS.filter(
		transformer => !hasCodeNodeDependency(transformer),
	),
	...MULTILINE_ELEMENT_TRANSFORMERS.filter(
		transformer => !hasCodeNodeDependency(transformer),
	),
	...TEXT_FORMAT_TRANSFORMERS,
	...TEXT_MATCH_TRANSFORMERS.filter(transformer => {
		// Remove link transformer: [text](url)
		if (transformer.type === 'text-match' && transformer.regExp) {
			const regexStr = transformer.regExp.toString();
			if (
				regexStr.includes('\\[') &&
				regexStr.includes('\\]') &&
				regexStr.includes('\\(') &&
				regexStr.includes('\\)')
			) {
				return false;
			}
		}
		return true;
	}),
];

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
			<div className="h-[185px] w-full animate-pulse rounded-lg bg-gray-50" />
		</div>
	);
}

// Plugin to sync markdown with form field
function MarkdownSyncPlugin({
	markdownValue,
	onMarkdownChange,
}: {
	markdownValue: string;
	onMarkdownChange: (markdown: string) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const lastMarkdownRef = useRef<string>(markdownValue || '');
	const isUpdatingRef = useRef(false);
	const isInitializedRef = useRef(false);

	// Initialize editor with markdown on mount (even if empty)
	useEffect(() => {
		if (!isInitializedRef.current) {
			isUpdatingRef.current = true;
			editor.update(() => {
				const root = $getRoot();
				root.clear();
				if (markdownValue) {
					$convertFromMarkdownString(markdownValue, MARKDOWN_TRANSFORMERS);
				}
			});
			lastMarkdownRef.current = markdownValue || '';
			isInitializedRef.current = true;
			setTimeout(() => {
				isUpdatingRef.current = false;
			}, 0);
		}
	}, [editor, markdownValue]);

	// Update editor when markdown value changes externally
	useEffect(() => {
		if (!isInitializedRef.current || isUpdatingRef.current) return;

		editor.getEditorState().read(() => {
			const currentMarkdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
			if (
				currentMarkdown !== markdownValue &&
				markdownValue !== lastMarkdownRef.current
			) {
				isUpdatingRef.current = true;
				editor.update(() => {
					const root = $getRoot();
					root.clear();
					if (markdownValue) {
						$convertFromMarkdownString(markdownValue, MARKDOWN_TRANSFORMERS);
					}
				});
				lastMarkdownRef.current = markdownValue || '';
				setTimeout(() => {
					isUpdatingRef.current = false;
				}, 0);
			}
		});
	}, [editor, markdownValue]);

	return (
		<OnChangePlugin
			ignoreSelectionChange={true}
			onChange={editorState => {
				if (isUpdatingRef.current || !isInitializedRef.current) return;

				editorState.read(() => {
					const markdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
					if (markdown !== lastMarkdownRef.current) {
						lastMarkdownRef.current = markdown;
						onMarkdownChange(markdown);
					}
				});
			}}
		/>
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
					placeholder="Enter raffle description"
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
