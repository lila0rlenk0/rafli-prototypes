'use client';

import { Pencil } from 'lucide-react';
import { type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/class-names';

interface ReviewSectionProps {
	/** Title rendered in the card header. */
	title: string;
	/** Optional supporting copy rendered under the title. */
	description?: string;
	/** Review rows — typically `<ReviewRow />` instances inside a `<dl>`. */
	children: ReactNode;
	/** Optional handler that renders an "Edit" ghost button at the header end. */
	onEdit?: () => void;
	/** Optional layout-only classes merged onto the root Card. */
	className?: string;
}

/**
 * Domain-agnostic titled group of review rows.
 *
 * Marked `'use client'` because the optional `onEdit` handler is a function
 * prop — Server Components cannot forward event handlers to DOM elements.
 * When `onEdit` is undefined the component still works, but the runtime
 * boundary stays client-side so a single component handles both shapes
 * (keeps call sites from having to pick between two variants).
 *
 * The header uses a CSS grid via CardHeader's `has-data-[slot=card-action]`
 * selector, so wrapping the button in a `data-slot="card-action"` node would
 * place it in the right column. We use a plain flex row instead because the
 * grid layout forces the action into a fixed column width, which we don't
 * need here — the ghost Button sizes itself.
 *
 * @returns Review section Card element.
 */
export function ReviewSection({
	title,
	description,
	children,
	onEdit,
	className,
}: ReviewSectionProps) {
	return (
		<Card className={cn('gap-4 py-4', className)}>
			<CardHeader className="flex flex-row items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<CardTitle>{title}</CardTitle>
					{description ? (
						<CardDescription>{description}</CardDescription>
					) : null}
				</div>
				{onEdit ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onEdit}
						aria-label={`Edit ${title}`}
					>
						<Pencil data-icon="inline-start" aria-hidden="true" />
						Edit
					</Button>
				) : null}
			</CardHeader>
			<CardContent>
				<dl className="flex flex-col gap-3">{children}</dl>
			</CardContent>
		</Card>
	);
}
