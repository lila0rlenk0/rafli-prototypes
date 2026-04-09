import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type StepStatus = 'completed' | 'active' | 'pending';

interface TimelineStepProps {
	/** Step title */
	title: string;
	/** Step description */
	description: string;
	/** Current step status */
	status: StepStatus;
	/** Whether this is the last step */
	isLast?: boolean;
	/** Optional action button */
	action?: ReactNode;
}

/**
 * TimelineStep Component
 *
 * Renders a single step in the fulfillment timeline.
 * Shows completed/active/pending states with appropriate visual indicators.
 */
export function TimelineStep({
	title,
	description,
	status,
	isLast = false,
	action,
}: TimelineStepProps) {
	return (
		<div className="flex gap-4">
			{/* Step indicator column */}
			<div className="flex flex-col items-center">
				{/* Circle indicator */}
				<div
					className={cn(
						'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
						status === 'completed' && 'border-black bg-black',
						status === 'active' && 'border-black bg-white',
						status === 'pending' && 'border-gray-300 bg-gray-100',
					)}
				>
					{status === 'completed' ? (
						<Check className="size-3.5 text-white" strokeWidth={3} />
					) : null}
					{status === 'active' ? (
						<div className="size-2 rounded-full bg-black" />
					) : null}
				</div>

				{/* Connector line */}
				{!isLast ? (
					<div
						className={cn(
							'mt-1 h-full min-h-8 w-0.5',
							status === 'completed' ? 'bg-black' : 'bg-gray-200',
						)}
					/>
				) : null}
			</div>

			{/* Content column */}
			<div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
				<h4
					className={cn(
						'font-semibold',
						status === 'pending' && 'text-gray-400',
					)}
				>
					{title}
				</h4>
				<p
					className={cn(
						'mt-0.5 text-sm',
						status === 'pending' ? 'text-gray-300' : 'text-gray-600',
					)}
				>
					{description}
				</p>
				{action && status === 'active' ? (
					<div className="mt-3">{action}</div>
				) : null}
			</div>
		</div>
	);
}
