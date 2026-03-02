'use client';

import { useState } from 'react';

import {
	CreatePromoCodeModal,
	type CreatePromoCodeData,
} from '@/components/promo-code/create-promo-code-modal';
import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PROMO_CODE_TYPE, type PromoCodeType } from '@/types/promo-code';
import { DollarSign, Info, Percent, Plus, Ticket, Trash2 } from 'lucide-react';

import { useMultiStepForm } from './multi-step-form-provider';

/** Max total pending promo codes allowed */
const MAX_PENDING_CODES = 20;

/**
 * Promo codes section for the raffle creation tickets step
 * Allows hosts to configure promo codes that will be created after raffle creation
 */
export function PromoCodesSection() {
	const { pendingPromoCodes, addPendingPromoCode, removePendingPromoCode } =
		useMultiStepForm();
	const [isModalOpen, setIsModalOpen] = useState(false);

	/**
	 * Gets total pending code count across all batches
	 */
	function getTotalPendingCount(): number {
		return pendingPromoCodes.reduce((sum, batch) => sum + batch.count, 0);
	}

	/**
	 * Checks if the limit has been reached
	 */
	function isLimitReached(): boolean {
		return getTotalPendingCount() >= MAX_PENDING_CODES;
	}

	/**
	 * Handles promo code creation from modal
	 * Stores data locally and closes modal immediately
	 */
	async function handleCreate(data: CreatePromoCodeData) {
		addPendingPromoCode(data);
		setIsModalOpen(false);
		return null;
	}

	/**
	 * Returns icon for promo code type
	 */
	function getTypeIcon(type: PromoCodeType) {
		switch (type) {
			case PROMO_CODE_TYPE.FREE_TICKETS:
				return <Ticket className="size-4 text-blue-600" />;
			case PROMO_CODE_TYPE.DISCOUNT_FIXED:
				return <DollarSign className="size-4 text-green-600" />;
			case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
				return <Percent className="size-4 text-purple-600" />;
			default:
				return null;
		}
	}

	/**
	 * Returns label for promo code type
	 */
	function getTypeLabel(type: PromoCodeType): string {
		switch (type) {
			case PROMO_CODE_TYPE.FREE_TICKETS:
				return 'Free';
			case PROMO_CODE_TYPE.DISCOUNT_FIXED:
				return 'Fixed';
			case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
				return 'Percent';
			default:
				return type;
		}
	}

	/**
	 * Formats value for display based on type
	 */
	function formatValue(type: PromoCodeType, value: number): string {
		switch (type) {
			case PROMO_CODE_TYPE.FREE_TICKETS:
				return `${value} ticket${value !== 1 ? 's' : ''}`;
			case PROMO_CODE_TYPE.DISCOUNT_FIXED:
				return `$${value.toFixed(2)}`;
			case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
				return `${value}%`;
			default:
				return String(value);
		}
	}

	/**
	 * Formats max uses for display
	 */
	function formatMaxUses(maxUses: number): string {
		return maxUses === 0 ? '∞' : String(maxUses);
	}

	/**
	 * Formats expiration for display
	 */
	function formatExpiration(expiresAt?: string): string {
		if (!expiresAt) return 'Never';
		return new Date(expiresAt).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	return (
		<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-semibold">
					Invite more people with promo codes
				</h2>
				<p className="text-sm text-gray-600">
					Create promotional codes for discounts or free tickets to boost
					participation in your raffle.
				</p>
			</div>

			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-3">
					<Button
						type="button"
						onClick={() => setIsModalOpen(true)}
						disabled={isLimitReached()}
						className="font-clash-display cursor-pointer border-2 border-black bg-white px-8 font-semibold text-black hover:bg-black hover:text-white"
					>
						<Plus className="size-4" />
						Create Code
					</Button>
					{isLimitReached() && (
						<span className="text-xs text-gray-500">
							Maximum of {MAX_PENDING_CODES} codes reached
						</span>
					)}
				</div>

				{pendingPromoCodes.length > 0 && (
					<div className="flex w-full items-start gap-2 rounded-lg bg-[#FEFFE3] p-4">
						<Info className="mt-0.5 size-4 shrink-0 text-[#B7CE00]" />
						<p className="text-sm">
							These are configurations only. Actual promo codes will be
							generated once your raffle goes live.
						</p>
					</div>
				)}

				{pendingPromoCodes.length > 0 && (
					<>
						{/* Desktop Table */}
						<div className="hidden overflow-x-auto md:block">
							<table className="w-full min-w-[500px]">
								<thead>
									<tr className="border-b border-[#F1F3F5] text-left text-sm text-gray-500">
										<th className="pb-3 font-medium">Type</th>
										<th className="pb-3 font-medium">Value</th>
										<th className="pb-3 font-medium">Codes</th>
										<th className="pb-3 font-medium">Max Uses</th>
										<th className="pb-3 font-medium">Expires</th>
										<th className="pb-3 font-medium">Status</th>
										<th className="pb-3 text-right font-medium" />
									</tr>
								</thead>
								<tbody>
									{pendingPromoCodes.map((batch, index) => (
										<tr
											key={index}
											className="border-t border-b border-[#F1F3F5]"
										>
											<td className="py-4">
												<div className="flex items-center gap-1.5">
													{getTypeIcon(batch.type)}
													<span className="text-sm">
														{getTypeLabel(batch.type)}
													</span>
												</div>
											</td>
											<td className="py-4 font-medium">
												{formatValue(batch.type, batch.value)}
											</td>
											<td className="py-4">{batch.count}</td>
											<td className="py-4">{formatMaxUses(batch.maxUses)}</td>
											<td className="py-4">
												{formatExpiration(batch.expiresAt)}
											</td>
											<td className="py-4">
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<span
																className={cn(
																	'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
																	'bg-amber-100 text-amber-700',
																)}
															>
																Queued
																<Info className="size-3" />
															</span>
														</TooltipTrigger>
														<TooltipContent>
															<p>
																Will be generated when your raffle goes live
															</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</td>
											<td className="py-4 text-right">
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													onClick={() => removePendingPromoCode(index)}
													className="text-gray-500 hover:text-red-600"
												>
													<Trash2 className="size-4" />
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile Cards */}
						<div className="space-y-3 md:hidden">
							{pendingPromoCodes.map((batch, index) => (
								<div
									key={index}
									className="rounded-lg border border-gray-200 bg-white p-4"
								>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-2 text-sm">
											{getTypeIcon(batch.type)}
											<span>{getTypeLabel(batch.type)}</span>
											<span
												className={cn(
													'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
													'bg-amber-100 text-amber-700',
												)}
											>
												Queued
											</span>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											onClick={() => removePendingPromoCode(index)}
											className="text-gray-500 hover:text-red-600"
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
									<div className="mt-2 text-sm font-medium">
										{formatValue(batch.type, batch.value)} &middot;{' '}
										{batch.count} code{batch.count !== 1 ? 's' : ''}
									</div>
									<div className="mt-1 text-xs text-gray-500">
										Max uses: {formatMaxUses(batch.maxUses)} &middot; Expires:{' '}
										{formatExpiration(batch.expiresAt)}
									</div>
									<p className="mt-2 text-xs text-amber-600">
										Will be generated when your raffle goes live
									</p>
								</div>
							))}
						</div>
					</>
				)}
			</div>

			<CreatePromoCodeModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onCreate={handleCreate}
				allowFreeTickets
			/>
		</div>
	);
}
