import {
	CHECK_LIST,
	ELEMENT_TRANSFORMERS,
	MULTILINE_ELEMENT_TRANSFORMERS,
	TEXT_FORMAT_TRANSFORMERS,
	TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';

import { ContentEditable } from '@/components/ui/editor/editor-ui/content-editable';
import { ListMaxIndentLevelPlugin } from '@/components/ui/editor/plugins/list-max-indent-level-plugin';
import { BlockFormatDropDown } from '@/components/ui/editor/plugins/toolbar/block-format-toolbar-plugin';
import { FormatBulletedList } from '@/components/ui/editor/plugins/toolbar/block-format/format-bulleted-list';
import { FormatCheckList } from '@/components/ui/editor/plugins/toolbar/block-format/format-check-list';
import { FormatHeading } from '@/components/ui/editor/plugins/toolbar/block-format/format-heading';
import { FormatNumberedList } from '@/components/ui/editor/plugins/toolbar/block-format/format-numbered-list';
import { FormatParagraph } from '@/components/ui/editor/plugins/toolbar/block-format/format-paragraph';
import { FormatQuote } from '@/components/ui/editor/plugins/toolbar/block-format/format-quote';
import { ElementFormatToolbarPlugin } from '@/components/ui/editor/plugins/toolbar/element-format-toolbar-plugin';
import { FontFormatToolbarPlugin } from '@/components/ui/editor/plugins/toolbar/font-format-toolbar-plugin';
import { HistoryToolbarPlugin } from '@/components/ui/editor/plugins/toolbar/history-toolbar-plugin';
import { ToolbarPlugin } from '@/components/ui/editor/plugins/toolbar/toolbar-plugin';

type PluginsProps = {
	placeholder?: string;
	contentClassName?: string;
	placeholderClassName?: string;
};

const defaultPlaceholder = 'Press / for commands...';

export function Plugins({
	placeholder,
	contentClassName,
	placeholderClassName,
}: PluginsProps) {
	return (
		<div className="relative">
			<ToolbarPlugin>
				{() => (
					<div className="vertical-align-middle sticky top-0 z-10 flex items-center gap-2 overflow-auto border-b p-1">
						<HistoryToolbarPlugin />
						<BlockFormatDropDown>
							<FormatParagraph />
							<FormatHeading levels={['h1', 'h2', 'h3']} />
							<FormatNumberedList />
							<FormatBulletedList />
							<FormatCheckList />
							<FormatQuote />
						</BlockFormatDropDown>
						<>
							<ElementFormatToolbarPlugin separator={false} />
							<FontFormatToolbarPlugin />
						</>
					</div>
				)}
			</ToolbarPlugin>
			<div className="relative">
				<RichTextPlugin
					contentEditable={
						<div className="">
							<div className="">
								<ContentEditable
									placeholder={placeholder ?? defaultPlaceholder}
									className={
										contentClassName ??
										'ContentEditable__root relative block h-[calc(100vh-50px)] min-h-72 overflow-auto px-8 py-4 focus:outline-none'
									}
									placeholderClassName={placeholderClassName}
								/>
							</div>
						</div>
					}
					ErrorBoundary={LexicalErrorBoundary}
				/>
				<HistoryPlugin />

				<ListPlugin />
				<ListMaxIndentLevelPlugin />
				<CheckListPlugin />

				<TabIndentationPlugin />
				<MarkdownShortcutPlugin
					transformers={[
						CHECK_LIST,
						...ELEMENT_TRANSFORMERS.filter(transformer => {
							// Remove code block transformer - requires CodeNode
							// Code blocks typically have regex matching ``` or `
							if ('regExp' in transformer && transformer.regExp) {
								const regexStr = transformer.regExp.toString();
								// Pattern for code blocks: ``` or `
								if (
									regexStr.includes('```') ||
									(regexStr.includes('`') && regexStr.includes('code'))
								) {
									return false;
								}
							}
							// Also check dependencies if available
							if (
								transformer.dependencies &&
								transformer.dependencies.length > 0
							) {
								const depNames = transformer.dependencies.map(
									dep => dep.name || dep.constructor?.name || String(dep),
								);
								if (
									depNames.some(
										name =>
											name.includes('Code') && !name.includes('CodeHighlight'),
									)
								) {
									return false;
								}
							}
							return true;
						}),
						...MULTILINE_ELEMENT_TRANSFORMERS.filter(transformer => {
							// Remove code block transformer - requires CodeNode
							if ('regExp' in transformer && transformer.regExp) {
								const regexStr = transformer.regExp.toString();
								if (
									regexStr.includes('```') ||
									(regexStr.includes('`') && regexStr.includes('code'))
								) {
									return false;
								}
							}
							if (
								transformer.dependencies &&
								transformer.dependencies.length > 0
							) {
								const depNames = transformer.dependencies.map(
									dep => dep.name || dep.constructor?.name || String(dep),
								);
								if (
									depNames.some(
										name =>
											name.includes('Code') && !name.includes('CodeHighlight'),
									)
								) {
									return false;
								}
							}
							return true;
						}),
						...TEXT_FORMAT_TRANSFORMERS,
						...TEXT_MATCH_TRANSFORMERS.filter(transformer => {
							// Remove link transformer: [text](url)
							if (transformer.type === 'text-match' && transformer.regExp) {
								const regexStr = transformer.regExp.toString();
								// Pattern for markdown links: [text](url)
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
					]}
				/>
			</div>
		</div>
	);
}
