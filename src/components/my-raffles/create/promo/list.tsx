'use client';

import { Info, Plus } from 'lucide-react';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';
import { Button } from '@/components/ui/button';

import { PromoCodeRow } from './row';

interface PromoCodesListProps {
	/** All pending batches — one entry per modal submission. */
	batches: readonly CreatePromoCodePayload[];
	/** Disables the create CTA once the global cap is hit. */
	isLimitReached: boolean;
	/** Shown next to the CTA when the cap is hit. */
	limitReachedLabel: string;
	/** Opens the create modal — parent owns modal state. */
	onAddClick: () => void;
	/** Remove callback indexed by position in `batches`. */
	onRemove: (index: number) => void;
}

/**
 * Renders the pending promo code list plus the "create code" CTA. Keeps
 * desktop + mobile layouts in one file so tweaks to either stay
 * adjacent.
 *
 * @returns Section body with CTA, informational banner, and batch list.
 */
export function PromoCodesList({
	batches,
	isLimitReached,
	limitReachedLabel,
	onAddClick,
	onRemove,
}: PromoCodesListProps) {
	const hasBatches = batches.length > 0;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<Button
					type="button"
					onClick={onAddClick}
					disabled={isLimitReached}
					className="font-clash-display cursor-pointer border-2 border-black bg-white px-8 font-semibold text-black hover:bg-black hover:text-white"
				>
					<Plus className="size-4" />
					Create Code
				</Button>
				{isLimitReached ? (
					<span className="text-xs text-gray-500">{limitReachedLabel}</span>
				) : null}
			</div>

			{hasBatches ? (
				<div className="flex w-full items-start gap-2 rounded-lg bg-yellow-100 p-4">
					<Info className="text-olive mt-0.5 size-4 shrink-0" />
					<p className="text-sm">
						These are configurations only. Promo codes will be generated once
						your raffle is scheduled (enters the queue).
					</p>
				</div>
			) : null}

			{hasBatches ? (
				<>
					{/* Desktop table — hidden below md to give mobile the card layout */}
					<div className="hidden overflow-x-auto md:block">
						<table className="w-full min-w-125">
							<thead>
								<tr className="border-cool-100 border-b text-left text-sm text-gray-500">
									<th className="pb-3 font-medium">Type</th>
									<th className="pb-3 font-medium">Value</th>
									<th className="pb-3 font-medium">Codes</th>
									<th className="pb-3 font-medium">Max Uses</th>
									<th className="pb-3 font-medium">Per User</th>
									<th className="pb-3 font-medium">Expires</th>
									<th className="pb-3 font-medium">Status</th>
									<th className="pb-3 text-right font-medium" />
								</tr>
							</thead>
							<tbody>
								{batches.map((batch, index) => (
									<PromoCodeRow
										// Index key is acceptable here: batches are append-only
										// within a single wizard session and removals re-render
										// the whole list anyway.
										key={index}
										batch={batch}
										variant="desktop"
										onRemove={() => onRemove(index)}
									/>
								))}
							</tbody>
						</table>
					</div>

					{/* Mobile card layout — mirrors desktop row content in a stacked form */}
					<div className="flex flex-col gap-3 md:hidden">
						{batches.map((batch, index) => (
							<PromoCodeRow
								key={index}
								batch={batch}
								variant="mobile"
								onRemove={() => onRemove(index)}
							/>
						))}
					</div>
				</>
			) : null}
		</div>
	);
}
