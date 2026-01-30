'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface CopyButtonProps {
	value: string;
	className?: string;
	size?: 'sm' | 'default';
}

/**
 * CopyButton Component
 *
 * Small button to copy a value to clipboard.
 * Shows checkmark for 2s after successful copy.
 */
export function CopyButton({ value, className, size = 'default' }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	/**
	 * Copies value to clipboard and shows feedback
	 */
	async function handleCopy() {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 2_000);
	}

	const iconSize = size === 'sm' ? 'size-2.5' : 'size-3.5';

	return (
		<button
			type="button"
			onClick={handleCopy}
			className={cn(
				'inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700',
				size === 'sm' ? 'p-0.5' : 'p-1',
				className,
			)}
			title="Copy to clipboard"
		>
			{copied ? <Check className={iconSize} /> : <Copy className={iconSize} />}
		</button>
	);
}
