'use client';

import {
	type InitialConfigType,
	LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { type EditorState, type SerializedEditorState } from 'lexical';

import { editorTheme } from '@/components/ui/editor/themes/editor-theme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/class-names';

import { nodes } from './nodes';
import { Plugins } from './plugins';

const editorConfig: InitialConfigType = {
	namespace: 'Editor',
	theme: editorTheme,
	nodes,
	onError: (error: Error) => {
		console.error(error);
	},
};

export function Editor({
	editorState,
	editorSerializedState,
	onChange,
	onSerializedChange,
	className,
	contentClassName,
	placeholder,
	placeholderClassName,
	children,
}: {
	editorState?: EditorState;
	editorSerializedState?: SerializedEditorState;
	onChange?: (editorState: EditorState) => void;
	onSerializedChange?: (editorSerializedState: SerializedEditorState) => void;
	className?: string;
	contentClassName?: string;
	placeholder?: string;
	placeholderClassName?: string;
	children?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				'overflow-hidden rounded-lg border bg-white shadow',
				className,
			)}
		>
			<LexicalComposer
				initialConfig={{
					...editorConfig,
					...(editorState ? { editorState } : {}),
					...(editorSerializedState
						? { editorState: JSON.stringify(editorSerializedState) }
						: {}),
				}}
			>
				<TooltipProvider>
					<Plugins
						placeholder={placeholder}
						contentClassName={contentClassName}
						placeholderClassName={placeholderClassName}
					/>

					<OnChangePlugin
						ignoreSelectionChange={true}
						onChange={editorState => {
							onChange?.(editorState);
							onSerializedChange?.(editorState.toJSON());
						}}
					/>
					{children}
				</TooltipProvider>
			</LexicalComposer>
		</div>
	);
}
