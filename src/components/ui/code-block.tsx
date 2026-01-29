'use client';

import { Check, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { cn } from '@/lib/utils';

interface CodeBlockProps {
	code: string;
	language?: string;
	filename?: string;
	showLineNumbers?: boolean;
	className?: string;
	highlightLines?: number[];
}

/**
 * CodeBlock Component
 *
 * Syntax-highlighted code block with copy button.
 * Aceternity-inspired design with dark theme.
 */
export function CodeBlock({
	code,
	language = 'typescript',
	filename,
	showLineNumbers = true,
	className,
	highlightLines,
}: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	/**
	 * Copies code to clipboard and shows feedback
	 */
	async function handleCopy() {
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2_000);
	}

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950',
				className,
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2">
				<div className="flex items-center gap-2">
					{/* Window dots */}
					<div className="flex gap-1.5">
						<div className="size-3 rounded-full bg-red-500/80" />
						<div className="size-3 rounded-full bg-yellow-500/80" />
						<div className="size-3 rounded-full bg-green-500/80" />
					</div>
					{filename && (
						<span className="ml-3 text-xs text-neutral-400">{filename}</span>
					)}
				</div>

				{/* Copy button */}
				<button
					type="button"
					onClick={handleCopy}
					className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
				>
					{copied ? (
						<motion.span
							initial={{ scale: 0.8 }}
							animate={{ scale: 1 }}
							className="flex items-center gap-1.5"
						>
							<Check className="size-3.5" />
							Copied
						</motion.span>
					) : (
						<span className="flex items-center gap-1.5">
							<Copy className="size-3.5" />
							Copy
						</span>
					)}
				</button>
			</div>

			{/* Code */}
			<div className="overflow-x-auto">
				<SyntaxHighlighter
					language={language}
					style={oneDark}
					showLineNumbers={showLineNumbers}
					customStyle={{
						margin: 0,
						padding: '1rem',
						background: 'transparent',
						fontSize: '0.8125rem',
					}}
					lineNumberStyle={{
						color: '#525252',
						paddingRight: '1rem',
						minWidth: '2rem',
					}}
					codeTagProps={{
						style: {
							background: 'transparent',
						},
					}}
					wrapLines
					lineProps={(lineNumber: number) => ({
						style: {
							background: highlightLines?.includes(lineNumber)
								? 'rgba(0, 184, 255, 0.15)'
								: 'transparent',
							borderLeft: highlightLines?.includes(lineNumber)
								? '3px solid #00B8FF'
								: '3px solid transparent',
							paddingLeft: highlightLines?.includes(lineNumber) ? '0.5rem' : '0',
							display: 'block',
						},
					})}
				>
					{code.trim()}
				</SyntaxHighlighter>
			</div>
		</div>
	);
}
