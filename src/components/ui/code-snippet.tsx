'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { cn } from '@/lib/utils';

interface CodeSnippetProps {
	code: string;
	language?: string;
	className?: string;
}

/**
 * Custom light theme based on reference design
 */
const lightTheme = {
	...oneLight,
	'pre[class*="language-"]': {
		...oneLight['pre[class*="language-"]'],
		background: 'transparent',
		margin: 0,
		padding: 0,
	},
	'code[class*="language-"]': {
		...oneLight['code[class*="language-"]'],
		background: 'transparent',
	},
	comment: { color: '#9CA3AF' },
	keyword: { color: '#8B5CF6' },
	'class-name': { color: '#8B5CF6' },
	function: { color: '#DC2626' },
	string: { color: '#059669' },
	number: { color: '#2563EB' },
	operator: { color: '#374151' },
	punctuation: { color: '#374151' },
	variable: { color: '#111827' },
	property: { color: '#111827' },
};

/**
 * CodeSnippet Component
 *
 * Minimal, light-themed code display without header or line numbers.
 */
export function CodeSnippet({
	code,
	language = 'typescript',
	className,
}: CodeSnippetProps) {
	return (
		<div
			className={cn(
				'overflow-hidden rounded-lg bg-[#F5F5F0] px-4 py-3',
				className,
			)}
		>
			<div className="overflow-x-auto">
				<SyntaxHighlighter
					language={language}
					style={lightTheme}
					showLineNumbers={false}
					customStyle={{
						margin: 0,
						padding: 0,
						background: 'transparent',
						fontSize: '0.8125rem',
						lineHeight: '1.5',
					}}
					codeTagProps={{
						style: {
							background: 'transparent',
							fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
						},
					}}
				>
					{code.trim()}
				</SyntaxHighlighter>
			</div>
		</div>
	);
}
