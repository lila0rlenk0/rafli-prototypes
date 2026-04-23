import { cn } from '@/lib/class-names';
import React from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';

type MarkdownRendererProps = {
	content: string;
	className?: string;
};

/**
 * MarkdownRenderer Component
 *
 * Renders markdown content with styling that matches the shadcn/ui design system
 * and the editor theme. Supports headings, paragraphs, lists, quotes, and text formatting.
 *
 * Follows the same styling patterns as defined in editor-theme.ts to ensure
 * visual consistency between the editor and rendered markdown.
 *
 * @param content - The markdown string to render
 * @param className - Optional additional CSS classes
 */
export function MarkdownRenderer({
	content,
	className,
}: MarkdownRendererProps) {
	if (!content) return null;

	const components: Components = {
		// Headings - matching editor-theme.ts heading styles
		h1: ({ children }: { children?: React.ReactNode }) => (
			<h1 className="mb-2 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
				{children}
			</h1>
		),
		h2: ({ children }: { children?: React.ReactNode }) => (
			<h2 className="mt-3 mb-2 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
				{children}
			</h2>
		),
		h3: ({ children }: { children?: React.ReactNode }) => (
			<h3 className="mt-3 mb-2 scroll-m-20 text-2xl font-semibold tracking-tight">
				{children}
			</h3>
		),
		h4: ({ children }: { children?: React.ReactNode }) => (
			<h4 className="mt-3 mb-2 scroll-m-20 text-xl font-semibold tracking-tight">
				{children}
			</h4>
		),
		h5: ({ children }: { children?: React.ReactNode }) => (
			<h5 className="mt-3 mb-2 scroll-m-20 text-lg font-semibold tracking-tight">
				{children}
			</h5>
		),
		h6: ({ children }: { children?: React.ReactNode }) => (
			<h6 className="mt-3 mb-2 scroll-m-20 text-base font-semibold tracking-tight">
				{children}
			</h6>
		),
		// Paragraphs - matching editor-theme.ts paragraph style
		// Capped vertical spacing to prevent hosts from creating excessive whitespace
		p: ({ children }: { children?: React.ReactNode }) => (
			<p className="mb-2 leading-7 not-first:mt-2">{children}</p>
		),
		// Lists - matching editor-theme.ts list styles
		ul: ({ children }: { children?: React.ReactNode }) => (
			<ul className="m-0 mb-4 ml-6 list-outside p-0 [&>li]:mt-2">{children}</ul>
		),
		ol: ({ children }: { children?: React.ReactNode }) => (
			<ol className="m-0 mb-4 ml-6 list-decimal p-0 [&>li]:mt-2">{children}</ol>
		),
		li: ({ children }: { children?: React.ReactNode }) => (
			<li className="list-item">{children}</li>
		),
		// Check lists (task lists) - matching editor-theme.ts checklist style
		input: ({ checked, type }: { checked?: boolean; type?: string }) => {
			if (type === 'checkbox') {
				return (
					<input
						type="checkbox"
						checked={checked || false}
						disabled
						className="border-primary mr-2 size-4 cursor-pointer rounded"
						readOnly
					/>
				);
			}
			return null;
		},
		// Blockquotes - matching editor-theme.ts quote style
		blockquote: ({ children }: { children?: React.ReactNode }) => (
			<blockquote className="mt-6 mb-4 border-l-2 pl-6 italic">
				{children}
			</blockquote>
		),
		// Text formatting - matching editor-theme.ts text styles
		strong: ({ children }: { children?: React.ReactNode }) => (
			<strong className="font-bold">{children}</strong>
		),
		em: ({ children }: { children?: React.ReactNode }) => (
			<em className="italic">{children}</em>
		),
		del: ({ children }: { children?: React.ReactNode }) => (
			<del className="line-through">{children}</del>
		),
		code: ({
			inline,
			children,
		}: {
			inline?: boolean;
			children?: React.ReactNode;
		}) => {
			if (inline) {
				return (
					<code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
						{children}
					</code>
				);
			}
			return (
				<code className="mb-4 block overflow-x-auto rounded-md bg-gray-100 p-4 font-mono text-sm">
					{children}
				</code>
			);
		},
		// Horizontal rule - matching editor-theme.ts hr style
		hr: () => <hr className="my-6 border-t border-gray-200" />,
	};

	return (
		<div className={cn('prose prose-sm max-w-none', className)}>
			<ReactMarkdown components={components}>{content}</ReactMarkdown>
		</div>
	);
}
