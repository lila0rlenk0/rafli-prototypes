'use client';

import { Info, Trash2 } from 'lucide-react';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';
import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/class-names';
import { formatUsageLimit } from '@/lib/utils/format/promo-code-format';

import {
	formatPromoExpiration,
	getPromoTypeEntry,
} from './promo-type-registry';

interface PromoCodeRowProps {
	/** Pending promo code batch payload rendered by this row. */
	batch: CreatePromoCodePayload;
	/**
	 * Layout variant — desktop renders table cells, mobile a card.
	 * Split as a prop (not a separate file) so formatting logic stays
	 * in one place.
	 */
	variant: 'desktop' | 'mobile';
	/** Invoked when the trash button is pressed. */
	onRemove: () => void;
}

// Queued badge styling is shared across variants — extracted to keep
// both JSX arms visually identical if the pill ever changes.
const QUEUED_BADGE_CLASSES =
	'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700';

/**
 * Single pending promo code row. Delegates all per-type display
 * decisions (icon, label, formatted value) to the registry so this
 * component is purely layout.
 *
 * @returns Table row for desktop or card block for mobile.
 */
export function PromoCodeRow({ batch, variant, onRemove }: PromoCodeRowProps) {
	const entry = getPromoTypeEntry(batch.type);
	const Icon = entry.icon;
	const typeLabel = entry.label;
	const formattedValue = entry.format(batch.value);

	if (variant === 'mobile') {
		return (
			<div className="rounded-lg border border-gray-200 bg-white p-4">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2 text-sm">
						<Icon className={cn('size-4', entry.iconClassName)} />
						<span>{typeLabel}</span>
						<span className={cn(QUEUED_BADGE_CLASSES, 'px-2')}>Queued</span>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onRemove}
						aria-label="Remove promo code batch"
						className="text-gray-500 hover:text-red-600"
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
				<div className="mt-2 text-sm font-medium">
					{formattedValue} &middot; {batch.count} code
					{batch.count !== 1 ? 's' : ''}
				</div>
				<div className="mt-1 text-xs text-gray-500">
					Max uses: {formatUsageLimit(batch.maxUses)} &middot; Per user:{' '}
					{formatUsageLimit(batch.maxRedemptionsPerUser)} &middot; Expires:{' '}
					{formatPromoExpiration(batch.expiresAt)}
				</div>
				<p className="mt-2 text-xs text-amber-600">
					Will be generated when your raffle goes live
				</p>
			</div>
		);
	}

	return (
		<tr className="border-cool-100 border-t border-b">
			<td className="py-4">
				<div className="flex items-center gap-1.5">
					<Icon className={cn('size-4', entry.iconClassName)} />
					<span className="text-sm">{typeLabel}</span>
				</div>
			</td>
			<td className="py-4 font-medium">{formattedValue}</td>
			<td className="py-4">{batch.count}</td>
			<td className="py-4">{formatUsageLimit(batch.maxUses)}</td>
			<td className="py-4">{formatUsageLimit(batch.maxRedemptionsPerUser)}</td>
			<td className="py-4">{formatPromoExpiration(batch.expiresAt)}</td>
			<td className="py-4">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className={QUEUED_BADGE_CLASSES}>
								Queued
								<Info className="size-3" />
							</span>
						</TooltipTrigger>
						<TooltipContent>
							<p>Will be generated when your raffle goes live</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</td>
			<td className="py-4 text-right">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onRemove}
					aria-label="Remove promo code batch"
					className="text-gray-500 hover:text-red-600"
				>
					<Trash2 className="size-4" />
				</Button>
			</td>
		</tr>
	);
}
