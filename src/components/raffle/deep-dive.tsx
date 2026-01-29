'use client';

import { ChevronDown, Code } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface DeepDiveProps {
	title?: string;
	children: React.ReactNode;
	className?: string;
	defaultOpen?: boolean;
}

/**
 * DeepDive Component
 *
 * Expandable section for technical deep dives.
 * Shows "Show the code" by default, reveals technical content on click.
 */
export function DeepDive({
	title = 'Show the code',
	children,
	className,
	defaultOpen = false,
}: DeepDiveProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	/**
	 * Toggles the expanded state
	 */
	function handleToggle() {
		setIsOpen(!isOpen);
	}

	return (
		<div className={cn('mt-4', className)}>
			<button
				type="button"
				onClick={handleToggle}
				className="flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
			>
				<Code className="size-4" />
				<span>{isOpen ? 'Hide technical details' : title}</span>
				<motion.span
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.2 }}
				>
					<ChevronDown className="size-4" />
				</motion.span>
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						className="overflow-hidden"
					>
						<div className="pt-4">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
