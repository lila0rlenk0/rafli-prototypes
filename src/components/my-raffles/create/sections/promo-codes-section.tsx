'use client';

import { useState } from 'react';

import {
	CreatePromoCodeModal,
	type CreatePromoCodePayload,
} from '@/components/promo-code/create/modal';

import { useMultiStepForm } from '@/components/my-raffles/create/multi-step-form-provider';
import { PromoCodesList } from '@/components/my-raffles/create/promo/list';

/**
 * Max total pending promo codes allowed across all batches. Matches the
 * backend bulk-create upper bound so hosts can't queue more than one
 * live generation would accept.
 */
const MAX_PENDING_CODES = 20;

/**
 * Promo codes section for the raffle creation tickets step. Orchestrates
 * the create modal and delegates rendering of the pending list to
 * `PromoCodesList`. Keeps this parent focused on wiring to the
 * multi-step form provider.
 *
 * @returns Card-styled section with CTA, banner, and pending batch list.
 */
export function PromoCodesSection() {
	const { pendingPromoCodes, addPendingPromoCode, removePendingPromoCode } =
		useMultiStepForm();
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Sum across batches — each batch represents a single bulk-create request
	// so `count` (the batch size) is what counts toward the cap.
	const totalPendingCount = pendingPromoCodes.reduce(
		(sum, batch) => sum + batch.count,
		0,
	);
	const isLimitReached = totalPendingCount >= MAX_PENDING_CODES;

	/**
	 * Handles promo code creation from the modal. Stores the batch
	 * locally — actual bulk creation happens post-raffle scheduling.
	 * Returns `null` because the modal's `onCreate` contract expects a
	 * response type it ignores on the pending path.
	 */
	async function handleCreate(data: CreatePromoCodePayload) {
		addPendingPromoCode(data);
		setIsModalOpen(false);
		return null;
	}

	function handleOpenModal() {
		setIsModalOpen(true);
	}

	function handleCloseModal() {
		setIsModalOpen(false);
	}

	return (
		<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-semibold">
					Invite more people with promo codes
				</h2>
				<p className="text-sm text-gray-600">
					Create promotional codes for discounts or bonus entries to boost
					participation in your raffle.
				</p>
			</div>

			<PromoCodesList
				batches={pendingPromoCodes}
				isLimitReached={isLimitReached}
				limitReachedLabel={`Maximum of ${MAX_PENDING_CODES} codes reached`}
				onAddClick={handleOpenModal}
				onRemove={removePendingPromoCode}
			/>

			<CreatePromoCodeModal
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				onCreate={handleCreate}
				allowFreeTickets
			/>
		</div>
	);
}
